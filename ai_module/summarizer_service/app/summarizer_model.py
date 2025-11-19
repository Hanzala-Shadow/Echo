from transformers import AutoModelForSeq2SeqLM, AutoTokenizer, pipeline
import time, re

# -------------------------------
# Load models safely
# -------------------------------
cache_dir = './models'

# Translator: Urdu → English
translator = pipeline(
    "translation",
    model="Helsinki-NLP/opus-mt-ur-en",
    cache_dir=cache_dir,
    local_files_only=True
)

# Summarizer: Dialogue optimized
tokenizer = AutoTokenizer.from_pretrained(
    "philschmid/bart-large-cnn-samsum",
    cache_dir=cache_dir,
    local_files_only=True
)
model = AutoModelForSeq2SeqLM.from_pretrained(
    "philschmid/bart-large-cnn-samsum",
    cache_dir=cache_dir,
    local_files_only=True
)
summarizer = pipeline(
    "summarization",
    model=model,
    tokenizer=tokenizer
)

# -------------------------------
# Helpers
# -------------------------------
def contains_urdu(text: str) -> bool:
    return re.search(r'[\u0600-\u06FF]', text) is not None

def polish_summary(text: str) -> str:
    text = re.sub(r'\bhotel room\b', '', text, flags=re.IGNORECASE)
    text = re.sub(r'Give a clear.*?summary', '', text, flags=re.IGNORECASE)
    text = re.sub(r'well-d', 'well-detailed', text)
    text = re.sub(r'\.\s*\.', '.', text)
    text = re.sub(r'\s+', ' ', text)
    if text and not text[-1] in '.!?':
        text += '.'
    text = re.sub(r'\bWi\.\s*Fi\b', 'Wi-Fi', text, flags=re.IGNORECASE)
    text = re.sub(r'\bwifi\b', 'Wi-Fi', text, flags=re.IGNORECASE)
    return text.strip()

def order_speakers_by_importance(messages: list[dict], speakers: list[str]) -> list[str]:
    speaker_stats = {}
    for speaker in speakers:
        msg_count = sum(1 for m in messages if m["sender_name"] == speaker)
        total_words = sum(len(m["content"].split()) for m in messages if m["sender_name"] == speaker)
        first_appearance = next(i for i, m in enumerate(messages) if m["sender_name"] == speaker)
        speaker_stats[speaker] = {'msg_count': msg_count, 'total_words': total_words, 'first_appearance': first_appearance}
    sorted_speakers = sorted(
        speakers,
        key=lambda s: (-speaker_stats[s]['msg_count'], -speaker_stats[s]['total_words'], speaker_stats[s]['first_appearance'])
    )
    return sorted_speakers

def get_speaker_messages(messages: list[dict], speaker: str) -> str:
    return " ".join(m["content"] for m in messages if m["sender_name"] == speaker)

# -------------------------------
# Core summarizer
# -------------------------------
def summarize_messages(messages: list[dict], mode="hybrid", style="structured") -> str:
    start_time = time.time()

    # Combine conversation
    conversation_text = "\n".join(
        f"{m.get('sender_name','Unknown')} ({m.get('time_stamp','')}): {m.get('content','')}" 
        for m in messages
    )

    # Translate Urdu if detected
    if contains_urdu(conversation_text):
        try:
            translated_text = translator(conversation_text, max_length=512)[0]['translation_text']
        except:
            translated_text = conversation_text
    else:
        translated_text = conversation_text

    num_msgs = len(messages)
    max_len = min(250, 50 + num_msgs * 8)
    min_len = max(30, 20 + num_msgs * 3)
    use_extractive = num_msgs > 15

    # --- GENERAL MODE ---
    if mode == "general":
        try:
            summary = summarizer(
                translated_text,
                max_new_tokens=max_len,
                min_length=min_len,
                do_sample=False
            )[0]['summary_text']
            return f"🧾 Overall Summary:\n{polish_summary(summary)}"
        except Exception as e:
            return f"❌ Error generating general summary: {e}"

    # --- SPEAKER MODE ---
    elif mode == "speaker":
        speaker_summaries = []
        unique_speakers = []
        seen = set()
        for msg in messages:
            speaker = msg["sender_name"]
            if speaker not in seen:
                unique_speakers.append(speaker)
                seen.add(speaker)
        unique_speakers = order_speakers_by_importance(messages, unique_speakers)

        for sender in unique_speakers:
            person_msgs = get_speaker_messages(messages, sender)
            if not person_msgs.strip():
                continue
            word_count = len(person_msgs.split())
            if use_extractive or word_count > 100:
                sentences = [s.strip() for s in person_msgs.split('.') if len(s.strip()) > 10]
                if len(sentences) <= 3:
                    summary_text = person_msgs
                else:
                    key_sentences = [sentences[0], sentences[len(sentences)//2], sentences[-1]]
                    summary_text = '. '.join(key_sentences) + '.'
                speaker_summaries.append(f"🗣️ {sender}: {summary_text}")
            else:
                try:
                    psum = summarizer(
                        person_msgs,
                        max_new_tokens=min(60, word_count + 10),
                        min_length=min(20, word_count),
                        do_sample=False
                    )[0]['summary_text']
                    speaker_summaries.append(f"🗣️ {sender}: {polish_summary(psum)}")
                except:
                    speaker_summaries.append(f"🗣️ {sender}: {person_msgs}")
        return "\n".join(speaker_summaries)

    # --- HYBRID MODE ---
    elif mode == "hybrid":
        # Overall summary
        if use_extractive:
            key_points, seen_speakers = [], set()
            step = max(1, len(messages)//6)
            for i in range(0, len(messages), step):
                msg = messages[i]
                sender, content = msg['sender_name'], msg['content']
                if len(content.split()) > 8 and sender not in seen_speakers:
                    if len(content.split()) > 20:
                        content = ' '.join(content.split()[:20]) + '...'
                    key_points.append(f"{sender}: {content}")
                    seen_speakers.add(sender)
                if len(key_points) >= 4:
                    break
            general = ". ".join(key_points) + "."
        else:
            try:
                general = summarizer(
                    translated_text,
                    max_new_tokens=max_len,
                    min_length=min_len,
                    do_sample=False
                )[0]['summary_text']
            except:
                general = translated_text[:200] + "..."

        # Speaker summaries
        speaker_summary_texts = []
        unique_speakers, seen = [], set()
        for msg in messages:
            speaker = msg["sender_name"]
            if speaker not in seen:
                unique_speakers.append(speaker)
                seen.add(speaker)
        unique_speakers = order_speakers_by_importance(messages, unique_speakers)

        for sender in unique_speakers:
            person_msgs = get_speaker_messages(messages, sender)
            if not person_msgs.strip():
                continue
            word_count = len(person_msgs.split())
            if word_count < 5:
                speaker_summary_texts.append(f"🗣️ {sender}: {person_msgs}")
            elif use_extractive or word_count > 80:
                sentences = [s.strip() for s in person_msgs.split('.') if len(s.strip()) > 10]
                if len(sentences) <= 2:
                    summary_text = person_msgs
                elif len(sentences) == 3:
                    summary_text = f"{sentences[0]}. {sentences[-1]}."
                else:
                    key_sentences = [sentences[0], sentences[len(sentences)//2], sentences[-1]]
                    summary_text = '. '.join(key_sentences)
                    if not summary_text.endswith('.'):
                        summary_text += '.'
                speaker_summary_texts.append(f"🗣️ {sender}: {polish_summary(summary_text)}")
            else:
                try:
                    psum = summarizer(
                        person_msgs,
                        max_new_tokens=min(50, word_count + 10),
                        min_length=min(15, word_count // 2),
                        do_sample=False
                    )[0]['summary_text']
                    speaker_summary_texts.append(f"🗣️ {sender}: {polish_summary(psum)}")
                except:
                    first_sentence = person_msgs.split('.')[0] + '.'
                    speaker_summary_texts.append(f"🗣️ {sender}: {first_sentence}")

        return (
            "🧾 **Overall Summary:**\n"
            + polish_summary(general)
            + "\n\n💬 **Speaker Highlights:**\n"
            + "\n".join(speaker_summary_texts)
        )

    else:
        return "❌ Invalid mode selected. Choose from: general, speaker, hybrid."
