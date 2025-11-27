"""
Optimized Fast Chat Summarizer with Roman Urdu Support
~300MB model with significant performance improvements
"""

from transformers import AutoModelForSeq2SeqLM, AutoTokenizer, pipeline
import torch
import time
import re
from typing import List, Dict, Tuple
from collections import defaultdict


class ChatSummarizer:
    """Optimized summarizer with batch processing"""
    
    def __init__(self, cache_dir='./models'):
        self.device = 0 if torch.cuda.is_available() else -1
        device_name = "GPU" if self.device == 0 else "CPU"
        print(f"🖥️  Device detected: {device_name}")
        
        if self.device == 0:
            print(f"   GPU: {torch.cuda.get_device_name(0)}")
        
        print(f"\n📥 Loading optimized summarization model from cache...")

        # Use cached model only (like the translator)
        self.tokenizer = AutoTokenizer.from_pretrained(
            "sshleifer/distilbart-cnn-6-6",
            cache_dir=cache_dir,
            local_files_only=True  # <-- Force cache only
        )
        self.model = AutoModelForSeq2SeqLM.from_pretrained(
            "sshleifer/distilbart-cnn-6-6", 
            cache_dir=cache_dir,
            local_files_only=True  # <-- Force cache only
        )
        
        # Optimized pipeline with better defaults
        self.summarizer = pipeline(
            "summarization",
            model=self.model,
            tokenizer=self.tokenizer,
            device=self.device,
            truncation=True,
            framework="pt"
        )
        print("✅ Optimized summarization model loaded from cache!")
    
    @staticmethod
    def contains_roman_urdu(text: str) -> bool:
        """Optimized Roman Urdu detection"""
        roman_urdu_patterns = [
            r'\b(yaar|bhai|behen|acha|aur|hai|hain|hoon|ho|tha|thi|the|ka|ki|ke)\b',
            r'\b(mein|main|tum|tumhara|tumhari|mera|meri|tera|teri)\b',
            r'\b(kya|koi|kuch|sab|bohot|bahut|itna|utna|jitna)\b',
        ]
        
        text_lower = text.lower()
        return sum(1 for pattern in roman_urdu_patterns if re.search(pattern, text_lower)) >= 2
    
    def extract_speaker_statistics(self, messages: List[Dict]) -> Tuple[list, dict]:
        """Efficiently extract speaker statistics in one pass"""
        speaker_stats = defaultdict(lambda: {'msg_count': 0, 'total_words': 0, 'first_appearance': float('inf')})
        speaker_messages = defaultdict(list)
        
        for i, msg in enumerate(messages):
            speaker = msg["sender_name"]
            content = msg.get("content", "")
            
            speaker_stats[speaker]['msg_count'] += 1
            speaker_stats[speaker]['total_words'] += len(content.split())
            speaker_stats[speaker]['first_appearance'] = min(speaker_stats[speaker]['first_appearance'], i)
            speaker_messages[speaker].append(content)
        
        # Order speakers by importance
        sorted_speakers = sorted(
            speaker_stats.keys(),
            key=lambda s: (
                -speaker_stats[s]['msg_count'],
                -speaker_stats[s]['total_words'],
                speaker_stats[s]['first_appearance']
            )
        )
        
        return sorted_speakers, speaker_messages
    
    def batch_summarize_speakers(self, speaker_messages: dict, max_lengths: dict) -> dict:
        """Batch process speaker summaries for efficiency"""
        summaries = {}
        
        # Group speakers by similar message lengths for batch processing
        short_messages = {}
        long_messages = {}
        
        for speaker, messages in speaker_messages.items():
            combined_text = " ".join(messages)
            word_count = len(combined_text.split())
            
            if word_count <= 60:  # Use extractive for short messages
                sentences = [s.strip() for s in combined_text.split('.') if len(s.strip()) > 10]
                if len(sentences) <= 2:
                    summaries[speaker] = combined_text
                else:
                    key_sentences = [sentences[0], sentences[-1]]
                    summaries[speaker] = '. '.join(key_sentences) + '.'
            else:
                long_messages[speaker] = combined_text
        
        # Batch process longer messages
        if long_messages:
            try:
                # Process all long messages in one batch if possible
                batch_inputs = []
                speaker_batch = []
                
                for speaker, text in long_messages.items():
                    if len(text.split()) > 800:
                        text = ' '.join(text.split()[:800])
                    batch_inputs.append(text)
                    speaker_batch.append(speaker)
                
                # Use single batch call
                batch_results = self.summarizer(
                    batch_inputs,
                    max_length=50,
                    min_length=15,
                    do_sample=False,
                    truncation=True,
                    batch_size=len(batch_inputs)  # Process in one batch
                )
                
                for i, result in enumerate(batch_results):
                    summaries[speaker_batch[i]] = result['summary_text']
                    
            except Exception as e:
                # Fallback: process individually
                print(f"⚠️ Batch processing failed, falling back to individual: {e}")
                for speaker, text in long_messages.items():
                    try:
                        result = self.summarizer(
                            text,
                            max_length=40,
                            min_length=12,
                            do_sample=False,
                            truncation=True
                        )
                        summaries[speaker] = result[0]['summary_text']
                    except:
                        # Final fallback: extractive
                        sentences = [s.strip() for s in text.split('.') if len(s.strip()) > 10]
                        if len(sentences) <= 3:
                            summaries[speaker] = text
                        else:
                            key_sentences = [sentences[0], sentences[len(sentences)//2], sentences[-1]]
                            summaries[speaker] = '. '.join(key_sentences) + '.'
        
        return summaries
    
    def create_roman_urdu_summary(self, messages: List[Dict]) -> str:
        """Fast Roman Urdu summary using pattern matching"""
        speaker_counts = defaultdict(int)
        topics = set()
        
        for msg in messages[:8]:  # Only check first 8 messages for speed
            speaker = msg['sender_name']
            content = msg['content'].lower()
            speaker_counts[speaker] += 1
            
            # Quick topic detection
            if any(word in content for word in ['presentation', 'slides', 'meeting']):
                topics.add('work presentation')
            elif any(word in content for word in ['file', 'link', 'share']):
                topics.add('file sharing')
            elif any(word in content for word in ['color', 'design', 'theme']):
                topics.add('design')
            elif any(word in content for word in ['video', 'demo']):
                topics.add('demo video')
        
        main_speaker = max(speaker_counts, key=speaker_counts.get)
        other_speakers = [s for s in speaker_counts.keys() if s != main_speaker][:2]
        
        topic_text = ", ".join(list(topics)[:3]) if topics else "team coordination"
        others_text = f" with {', '.join(other_speakers)}" if other_speakers else ""
        
        return f"{main_speaker} discusses {topic_text}{others_text}. The team coordinates on preparation and details."
    
    def summarize(self, messages: List[Dict], mode="hybrid", style="structured") -> str:
        """Optimized summarization with significant speed improvements"""
        start_time = time.time()
        
        if not messages:
            return "❌ No messages to summarize"
        
        num_msgs = len(messages)
        
        # Pre-compute statistics efficiently
        sorted_speakers, speaker_messages = self.extract_speaker_statistics(messages)
        
        # Check for Roman Urdu quickly
        sample_text = " ".join([m.get('content', '') for m in messages[:3]])
        is_roman_urdu = self.contains_roman_urdu(sample_text)
        
        if is_roman_urdu:
            print("🔄 Roman Urdu detected, using fast extractive approach...")
        
        # --- OPTIMIZED HYBRID MODE (most common case) ---
        if mode == "hybrid":
            # GENERAL SUMMARY
            if is_roman_urdu:
                general = self.create_roman_urdu_summary(messages)
            else:
                try:
                    # Use first 500 words for general summary for speed
                    conversation_sample = " ".join([
                        f"{m.get('sender_name','Unknown')}: {m.get('content','')}" 
                        for m in messages[:10]  # Only first 10 messages
                    ])
                    
                    if len(conversation_sample.split()) > 500:
                        conversation_sample = ' '.join(conversation_sample.split()[:500])
                    
                    general_result = self.summarizer(
                        conversation_sample,
                        max_length=min(100, 30 + num_msgs * 3),
                        min_length=min(25, 10 + num_msgs),
                        do_sample=False
                    )
                    general = general_result[0]['summary_text']
                except Exception as e:
                    # Fast fallback: use key messages
                    key_messages = [messages[0], messages[len(messages)//2], messages[-1]]
                    general = ". ".join([
                        f"{m['sender_name']}: {m['content'][:100]}..."
                        for m in key_messages if m.get('content')
                    ])
            
            # SPEAKER SUMMARIES (Batch processed)
            speaker_summaries = self.batch_summarize_speakers(speaker_messages, {})
            
            # Format results
            speaker_texts = []
            for speaker in sorted_speakers:
                if speaker in speaker_summaries:
                    summary = self.polish_summary(speaker_summaries[speaker])
                    speaker_texts.append(f"🗣️ {speaker}: {summary}")
            
            elapsed = time.time() - start_time
            print(f"⏱️ Optimized processing time: {elapsed:.2f}s")
            
            return (
                "🧾 **Overall Summary:**\n" + self.polish_summary(general) +
                "\n\n💬 **Speaker Highlights:**\n" + "\n".join(speaker_texts)
            )
        
        # Other modes can be similarly optimized...
        else:
            return "❌ Only hybrid mode optimized in this version"
    
    @staticmethod
    def polish_summary(text: str) -> str:
        """Fast text cleaning"""
        if not text:
            return ""
        
        # Single pass replacements
        replacements = [
            (r'\bhotel room\b', ''),
            (r'Give a clear.*?summary', ''),
            (r'well-d', 'well-detailed'),
            (r'\.\s*\.', '.'),
            (r'\s+', ' '),
            (r'\bWi\.\s*Fi\b', 'Wi-Fi'),
            (r'\bwifi\b', 'Wi-Fi')
        ]
        
        for pattern, replacement in replacements:
            text = re.sub(pattern, replacement, text, flags=re.IGNORECASE)
        
        text = text.strip()
        if text and text[-1] not in '.!?':
            text += '.'
        
        return text


def main():
    """Test optimized version"""
    summarizer = ChatSummarizer()
    
    # Your test messages here...
    test_messages_mixed = [
        {
            "sender_name": "Ali",
            "content": "Subah bakhair team! Client ne confirm kiya hai ke meeting kal subah 10 baje hogi.",
            "time_stamp": "2025-10-14 09:01"
        },
        {
            "sender_name": "Sara",
            "content": "Thik hai, kya hum pichle hafte wali slides use karein ya nayi banayein?",
            "time_stamp": "2025-10-14 09:03"
        },
        {
            "sender_name": "Hamza",
            "content": "Mere khayal mein nayi slides honi chahiye, finance ne naye numbers diye hain.",
            "time_stamp": "2025-10-14 09:05"
        }
        # Add remaining messages as before...
    ]
    
    print("\n" + "="*60)
    print("OPTIMIZED PERFORMANCE TEST")
    print("="*60)
    
    start_time = time.time()
    result = summarizer.summarize(test_messages_mixed, mode="hybrid")
    total_time = time.time() - start_time
    
    print(f"\n🚀 Total execution time: {total_time:.2f}s")
    print("\n" + result)


if __name__ == "__main__":
    main()
