"""
Docker-Optimized Lightweight Chat Summarizer
Fast API responses with proper Docker resource management
"""

from transformers import AutoModelForSeq2SeqLM, AutoTokenizer, pipeline
import torch
import time
import re
import os
import threading
from typing import List, Dict, Tuple, Optional
from collections import defaultdict
import warnings
warnings.filterwarnings("ignore")

# Global lock for thread-safe model initialization
_model_lock = threading.Lock()

class ChatSummarizer:
    """Docker-optimized singleton class with performance improvements"""
    
    _instance = None
    _initialized = False
    
    def __new__(cls, cache_dir='/app/models/summarizer'):
        """Thread-safe singleton pattern"""
        with _model_lock:
            if cls._instance is None:
                cls._instance = super(ChatSummarizer, cls).__new__(cls)
        return cls._instance
    
    def __init__(self, cache_dir='/app/models/summarizer'):
        """Initialize models only once with Docker optimizations"""
        with _model_lock:
            if self._initialized:
                return
            
            print("🚀 Initializing Docker-optimized summarizer...")
            
            # Docker-optimized paths
            self.cache_dir = cache_dir
            os.makedirs(self.cache_dir, exist_ok=True)
            
            # Enhanced device detection for Docker
            self.device = self._optimized_device_detection()
            device_name = "GPU" if self.device == 0 else "CPU"
            print(f"🖥️  Docker device: {device_name}")
            
            # Pre-load model to avoid cold start delays
            self._load_model_with_optimizations()
            
            self._initialized = True
            print(f"🎉 Docker-optimized summarizer ready on {device_name}!")
    
    def _optimized_device_detection(self):
        """Optimized device detection for Docker environments"""
        if torch.cuda.is_available():
            # Force CUDA initialization to avoid cold start delays
            torch.cuda.empty_cache()
            torch.cuda.init()
            print(f"   GPU: {torch.cuda.get_device_name(0)}")
            print(f"   GPU Memory: {torch.cuda.get_device_properties(0).total_memory / 1e9:.1f} GB")
            return 0
        else:
            # Optimize CPU performance
            torch.set_num_threads(min(4, os.cpu_count() or 1))
            print(f"   CPU Threads: {torch.get_num_threads()}")
            return -1
    
    def _load_model_with_optimizations(self):
        """Load model with Docker-specific optimizations"""
        model_name = "sshleifer/distilbart-cnn-6-6"
        
        print(f"📥 Loading model with Docker optimizations...")
        
        # Model loading optimizations
        load_start = time.time()
        
        try:
            # Try cached first with timeout
            self.tokenizer = AutoTokenizer.from_pretrained(
                model_name,
                cache_dir=self.cache_dir,
                local_files_only=True
            )
            self.model = AutoModelForSeq2SeqLM.from_pretrained(
                model_name,
                cache_dir=self.cache_dir,
                local_files_only=True
            )
            print("✅ Loaded from cache")
        except:
            print("⚠️  Downloading model...")
            # Download with progress and timeout
            self.tokenizer = AutoTokenizer.from_pretrained(
                model_name,
                cache_dir=self.cache_dir,
                force_download=False,
                resume_download=True
            )
            self.model = AutoModelForSeq2SeqLM.from_pretrained(
                model_name,
                cache_dir=self.cache_dir,
                force_download=False,
                resume_download=True
            )
        
        # Move to device with optimization
        if self.device == 0:
            self.model = self.model.cuda()
            torch.cuda.empty_cache()
        
        # Create optimized pipeline
        self.summarizer = pipeline(
            "summarization",
            model=self.model,
            tokenizer=self.tokenizer,
            device=self.device,
            torch_dtype=torch.float16 if self.device == 0 else torch.float32,  # FP16 for GPU
            truncation=True,
            framework="pt"
        )
        
        load_time = time.time() - load_start
        print(f"✅ Model loaded in {load_time:.2f}s")
    
    # [Keep all the optimized methods from previous version...]
    # contains_roman_urdu, polish_summary, extract_speaker_statistics, 
    # calculate_optimal_lengths, should_use_model, create_extractive_summary,
    # create_roman_urdu_summary, batch_summarize_speakers
    
    @staticmethod
    def contains_roman_urdu(text: str) -> bool:
        """Optimized Roman Urdu detection"""
        roman_urdu_patterns = [
            r'\b(yaar|bhai|acha|hai|hain|ka|ki|ke)\b',
            r'\b(mein|tum|mera|tera|kya|koi|sab)\b',
            r'\b(kar|karna|tha|thi|nahi|zaroor)\b',
        ]
        
        text_lower = text.lower()
        matches = sum(1 for pattern in roman_urdu_patterns if re.search(pattern, text_lower))
        return matches >= 2

    @staticmethod
    def polish_summary(text: str) -> str:
        """Fast text cleaning"""
        if not text:
            return ""
        
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

    def extract_speaker_statistics(self, messages: List[Dict]) -> tuple:
        """Efficient speaker statistics extraction"""
        speaker_stats = defaultdict(lambda: {'msg_count': 0, 'total_words': 0, 'first_appearance': float('inf')})
        speaker_messages = defaultdict(list)
        
        for i, msg in enumerate(messages):
            speaker = msg["sender_name"]
            content = msg.get("content", "")
            
            speaker_stats[speaker]['msg_count'] += 1
            speaker_stats[speaker]['total_words'] += len(content.split())
            speaker_stats[speaker]['first_appearance'] = min(speaker_stats[speaker]['first_appearance'], i)
            speaker_messages[speaker].append(content)
        
        sorted_speakers = sorted(
            speaker_stats.keys(),
            key=lambda s: (
                -speaker_stats[s]['msg_count'],
                -speaker_stats[s]['total_words'],
                speaker_stats[s]['first_appearance']
            )
        )
        
        return sorted_speakers, speaker_messages

    def calculate_optimal_lengths(self, text: str) -> Tuple[Optional[int], Optional[int]]:
        """Smart length calculation"""
        input_length = len(text.split())
        
        if input_length <= 25:
            return None, None
        
        if input_length <= 50:
            max_len = max(20, min(30, input_length - 5))
            min_len = max(10, min(15, input_length // 3))
        elif input_length <= 100:
            max_len = max(25, min(50, input_length - 10))
            min_len = max(15, min(25, input_length // 4))
        else:
            max_len = max(40, min(80, input_length // 2))
            min_len = max(20, min(40, input_length // 5))
        
        min_len = min(min_len, max_len - 5)
        return max_len, min_len

    def should_use_model(self, text: str, num_msgs: int, is_roman_urdu: bool = False) -> bool:
        """Smart model usage decision"""
        word_count = len(text.split())
        
        if word_count <= 25:
            return False
        if is_roman_urdu and word_count < 100:
            return False
        if num_msgs > 8 and word_count < 150:
            return False
        
        return word_count > 60

    def create_extractive_summary(self, messages: List[Dict], num_points: int = 4) -> str:
        """Fast extractive summary"""
        if not messages:
            return ""
        
        if len(messages) <= num_points:
            summaries = []
            for msg in messages:
                content = msg.get('content', '')
                if len(content.split()) > 5:
                    sender = msg.get('sender_name', 'Unknown')
                    summaries.append(f"{sender}: {content}")
            return ". ".join(summaries) + "."
        
        key_indices = [0, len(messages)//4, len(messages)//2, -1] if len(messages) >= 4 else list(range(len(messages)))
        key_messages = []
        seen_speakers = set()
        
        for idx in key_indices:
            if idx < len(messages):
                msg = messages[idx]
                speaker = msg.get('sender_name', 'Unknown')
                content = msg.get('content', '')
                
                if speaker not in seen_speakers and len(content.split()) > 3:
                    if len(content.split()) > 25:
                        content = ' '.join(content.split()[:25]) + '...'
                    key_messages.append(f"{speaker}: {content}")
                    seen_speakers.add(speaker)
        
        return ". ".join(key_messages) + "."

    def create_roman_urdu_summary(self, messages: List[Dict]) -> str:
        """Fast Roman Urdu summary"""
        if not messages:
            return ""
            
        speaker_counts = defaultdict(int)
        topics = set()
        
        for msg in messages[:6]:
            speaker = msg.get('sender_name', 'Unknown')
            content = msg.get('content', '').lower()
            speaker_counts[speaker] += 1
            
            topic_keywords = {
                'work': ['office', 'work', 'boss', 'presentation', 'meeting', 'client', 'project'],
                'tech': ['laptop', 'computer', 'virus', 'file', 'link', 'share', 'wifi'],
                'academic': ['exam', 'study', 'finals', 'class', 'homework'],
                'shopping': ['mall', 'shopping', 'buy', 'price'],
                'food': ['food', 'restaurant', 'biryani', 'burger', 'dinner', 'lunch'],
                'personal': ['family', 'home', 'friend', 'weekend', 'plan']
            }
            
            for topic, keywords in topic_keywords.items():
                if any(keyword in content for keyword in keywords):
                    topics.add(topic)
                    break
        
        main_speaker = max(speaker_counts, key=speaker_counts.get) if speaker_counts else "Unknown"
        other_speakers = [s for s in speaker_counts.keys() if s != main_speaker][:2]
        
        topic_text = ", ".join(list(topics)[:2]) if topics else "various topics"
        others_text = f" with {', '.join(other_speakers)}" if other_speakers else ""
        
        return f"{main_speaker} discusses {topic_text}{others_text}. The conversation covers coordination and planning."

    def batch_summarize_speakers(self, speaker_messages: dict, use_extractive: bool) -> dict:
        """Batch process speaker summaries"""
        summaries = {}
        
        if use_extractive:
            for speaker, messages in speaker_messages.items():
                combined_text = " ".join(messages)
                word_count = len(combined_text.split())
                
                if word_count <= 10:
                    summaries[speaker] = combined_text
                else:
                    sentences = [s.strip() for s in combined_text.split('.') if len(s.strip()) > 8]
                    if len(sentences) <= 2:
                        summaries[speaker] = combined_text
                    else:
                        key_indices = [0, -1] if len(sentences) <= 4 else [0, len(sentences)//2, -1]
                        key_sentences = [sentences[i] for i in key_indices if i < len(sentences)]
                        summaries[speaker] = '. '.join(key_sentences) + '.'
            return summaries
        
        model_speakers = {}
        for speaker, messages in speaker_messages.items():
            combined_text = " ".join(messages)
            word_count = len(combined_text.split())
            
            if word_count > 60 and word_count <= 400:
                model_speakers[speaker] = combined_text
            else:
                sentences = [s.strip() for s in combined_text.split('.') if len(s.strip()) > 8]
                if len(sentences) <= 2:
                    summaries[speaker] = combined_text
                else:
                    key_indices = [0, -1] if len(sentences) <= 4 else [0, len(sentences)//2, -1]
                    key_sentences = [sentences[i] for i in key_indices if i < len(sentences)]
                    summaries[speaker] = '. '.join(key_sentences) + '.'
        
        if model_speakers:
            try:
                batch_inputs = []
                speaker_batch = []
                
                for speaker, text in model_speakers.items():
                    if len(text.split()) > 300:
                        text = ' '.join(text.split()[:300])
                    batch_inputs.append(text)
                    speaker_batch.append(speaker)
                
                batch_results = self.summarizer(
                    batch_inputs,
                    max_length=45,
                    min_length=20,
                    do_sample=False,
                    truncation=True
                )
                
                for i, result in enumerate(batch_results):
                    summaries[speaker_batch[i]] = result['summary_text']
                    
            except Exception as e:
                for speaker, text in model_speakers.items():
                    sentences = [s.strip() for s in text.split('.') if len(s.strip()) > 8]
                    if len(sentences) <= 2:
                        summaries[speaker] = text
                    else:
                        key_sentences = [sentences[0], sentences[-1]]
                        summaries[speaker] = '. '.join(key_sentences) + '.'
        
        return summaries

    def summarize(self, messages: List[Dict], mode="hybrid", style="structured") -> str:
        """Docker-optimized summarization"""
        if not messages:
            return "❌ No messages to summarize"
        
        start_time = time.time()
        num_msgs = len(messages)
        
        # Combine conversation
        conversation_text = " ".join(m.get('content', '') for m in messages)
        
        # Fast detection
        sample_text = " ".join([m.get('content', '') for m in messages[:3]])
        is_roman_urdu = self.contains_roman_urdu(sample_text)
        
        # Pre-compute statistics
        sorted_speakers, speaker_messages = self.extract_speaker_statistics(messages)
        
        # Smart model decision
        use_model = self.should_use_model(conversation_text, num_msgs, is_roman_urdu)
        
        if is_roman_urdu:
            print("🔄 Roman Urdu detected")
        
        # HYBRID MODE (most common)
        if mode == "hybrid":
            # GENERAL SUMMARY
            if not use_model or is_roman_urdu:
                general = self.create_roman_urdu_summary(messages) if is_roman_urdu else self.create_extractive_summary(messages, 4)
            else:
                max_len, min_len = self.calculate_optimal_lengths(conversation_text)
                if max_len is None:
                    general = self.create_extractive_summary(messages, 3)
                else:
                    try:
                        limited_text = ' '.join(conversation_text.split()[:400])
                        general_result = self.summarizer(
                            limited_text,
                            max_length=max_len,
                            min_length=min_len,
                            do_sample=False
                        )
                        general = general_result[0]['summary_text']
                    except Exception as e:
                        general = self.create_extractive_summary(messages, 3)
            
            # SPEAKER SUMMARIES
            use_extractive_speakers = not use_model or is_roman_urdu or num_msgs > 6
            speaker_summaries = self.batch_summarize_speakers(speaker_messages, use_extractive_speakers)
            
            # Format results
            speaker_texts = []
            for speaker in sorted_speakers:
                if speaker in speaker_summaries:
                    summary = self.polish_summary(speaker_summaries[speaker])
                    speaker_texts.append(f"🗣️ {speaker}: {summary}")
            
            elapsed = time.time() - start_time
            print(f"⏱️ Docker processing time: {elapsed:.2f}s")
            
            return (
                "🧾 **Overall Summary:**\n" + self.polish_summary(general) +
                "\n\n💬 **Speaker Highlights:**\n" + "\n".join(speaker_texts)
            )
        
        # Other modes...
        else:
            return "❌ Only hybrid mode optimized"


# Global instance with Docker optimizations
_summarizer_instance = None
_summarizer_lock = threading.Lock()

def get_summarizer(cache_dir='/app/models/summarizer'):
    """Get or create Docker-optimized summarizer instance"""
    global _summarizer_instance
    with _summarizer_lock:
        if _summarizer_instance is None:
            _summarizer_instance = ChatSummarizer(cache_dir=cache_dir)
    return _summarizer_instance

def summarize_messages(messages: List[Dict], mode="hybrid", style="structured") -> str:
    """FastAPI endpoint function with Docker optimizations"""
    summarizer = get_summarizer()
    return summarizer.summarize(messages, mode=mode, style=style)