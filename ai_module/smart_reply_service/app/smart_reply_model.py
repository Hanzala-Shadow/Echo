import os
os.environ['TRANSFORMERS_CACHE'] = os.getenv('TRANSFORMERS_CACHE', './models')
os.environ['HF_HOME'] = os.getenv('HF_HOME', './models')

import torch
from transformers import AutoTokenizer, AutoModelForCausalLM
import re
from typing import List
import random

class SmartReplySystem:
    def __init__(self, model_name="microsoft/DialoGPT-medium"):
        """
        Initialize the Smart Reply System with a local model.
        
        Models you can use:
        - "microsoft/DialoGPT-small" (fast, lightweight)
        - "microsoft/DialoGPT-medium" (balanced)
        - "microsoft/DialoGPT-large" (better quality, slower)
        """
        cache_dir = os.environ.get('TRANSFORMERS_CACHE', './models')
        
        print(f"Loading model from cache: {model_name}...")
        print(f"Cache directory: {cache_dir}")
        
        try:
            self.tokenizer = AutoTokenizer.from_pretrained(
                model_name,
                cache_dir=cache_dir,
                local_files_only=True
            )
            self.model = AutoModelForCausalLM.from_pretrained(
                model_name,
                cache_dir=cache_dir,
                local_files_only=True
            )
            print("✅ Model loaded from cache successfully!")
        except Exception as e:
            print(f"❌ Error loading model from cache: {e}")
            print("   Run download_all_models.py first!")
            raise
        
        # Set padding token if not already set
        if self.tokenizer.pad_token is None:
            self.tokenizer.pad_token = self.tokenizer.eos_token
        
        # Initialize Roman Urdu knowledge base
        self._init_urdu_patterns()
        
        print("✅ Smart Reply System ready!\n")
    
    
    def _init_urdu_patterns(self):
        """Initialize comprehensive Roman Urdu patterns and responses."""
        self.urdu_patterns = {
            # Greetings
            r'\b(assalam(u|o) ?alaikum|salam|salaam)\b': [
                "Walaikum assalam!", "Walaikum salam, kaise hain?", "Wasalam! Kya haal hai?", 
                "Walaikum assalam, sab theek?", "Wasalam bhai!"
            ],
            r'\b(hello|hi|hey)\b.*\b(kaise|kaisi|kya)\b': [
                "Hello! Main theek hun, tum sunao", "Hi! Sab badhiya, aap batao",
                "Hey! Bilkul mast, aap kaise ho?", "Hello ji! Alhamdulillah theek"
            ],
            
            # How are you variants
            r'\b(kya haal|kaise ho|kaisi ho|kaisay ho|kese ho|keyse ho)\b': [
                "Alhamdulillah theek hun, aap sunao", "Sab khairiyat hai, tum batao",
                "Bilkul badhiya! Aap kaise hain?", "Mast hun yaar!", "Theek thak, aap?",
                "Bas chal raha hai, tum sunao", "First class! Aap batain"
            ],
            r'\b(kaisa (chal )?raha|kesa (chal )?raha|keysa (chal )?raha)\b': [
                "Sab theek chal raha hai", "Alhamdulillah achha chal raha hai",
                "Mast chal raha hai yaar", "Theek hai, aap batao", "Bas normal sa"
            ],
            
            # What are you doing
            r'\b(kya kar (rahe|rahi|rhe|rhi)|kia kar (rahe|rahi|rhe|rhi)|kya ho raha)\b': [
                "Kuch khas nahi, aap?", "Bas yun hi, free hun", "Ghar pe hun abhi",
                "Work kar raha hun", "Kuch nahi yaar, bore ho raha hun", "Free time hai abhi"
            ],
            
            # Thanks
            r'\b(shukriya|shukria|thanks|thank you|mehrbani|mehrbaan)\b': [
                "Koi baat nahi", "Welcome hai", "Hamesha!", "Zaroor yaar",
                "Mention not", "Bilkul, koi masla nahi", "Arey koi baat nahi"
            ],
            
            # Agreement/Yes
            r'\b(haan|han|haa|ha|yes|okay|ok|theek|thik|acha|achha)\b': [
                "Haan bilkul!", "Theek hai", "Okay done", "Sure!", "Haan jee",
                "Bilkul theek", "Sahi hai", "Perfect"
            ],
            
            # Disagreement/No
            r'\b(nahi|nahin|nai|na|no|nope)\b': [
                "Okay, koi baat nahi", "Theek hai phir", "Alright", "No problem",
                "Samajh gaya", "Koi masla nahi"
            ],
            
            # Questions about time/when
            r'\b(kab|when|kitne baje|kis waqt)\b': [
                "Abhi batata hun", "Thori der mein", "Jaldi hi", "Bas 5 minute mein",
                "Abhi check kar ke batata hun", "Shaam ko?", "Kal sahi rahega?"
            ],
            
            # Questions about location/where
            r'\b(kahan|kidhar|where|kaha)\b': [
                "Ghar pe hun", "Office mein", "Bahar hun abhi", "Yahan hi hun",
                "Wahan hi hun", "City mein", "Raste pe hun"
            ],
            
            # Meeting/Plans
            r'\b(mil(te|enge|na hai)|meet|mulaqat|plan)\b': [
                "Haan zaroor milte hain!", "Kab milna hai?", "Sure, batao kab?",
                "Weekend pe milte hain", "Theek hai, time batao", "Milte hain jaldi"
            ],
            
            # Food/Eating
            r'\b(khana|khaya|kha (liya|lia)|dinner|lunch|breakfast)\b': [
                "Abhi nahi khaya", "Haan kha liya", "Khane ja raha hun",
                "Thori der mein khaunga", "Tum khao pehle", "Khana order kar lete hain"
            ],
            
            # Coming/Going
            r'\b(aa (raha|rahi|rahe)|ja (raha|rahi|rahe)|aaja|ajao)\b': [
                "Haan aa raha hun", "Bas 5 minute mein", "Pahunch gaya",
                "Raste pe hun", "Thora wait karo", "Coming!"
            ],
            
            # Work/Job
            r'\b(kaam|work|job|office|busy)\b': [
                "Kaam chal raha hai", "Busy hun thora", "Office mein hun",
                "Kaam khatam hone wala hai", "Free ho jaunga jaldi", "Break pe hun"
            ],
            
            # Sleep/Rest
            r'\b(so (gaye|gya|raha|rhe)|sona|neend|sleep)\b': [
                "Haan sone ja raha hun", "Nahi abhi nahi", "Neend aa rahi hai",
                "Thori der mein sounga", "Good night!", "Acha rest karo"
            ],
            
            # Why questions
            r'\b(kyun|kyu|kyo|why|kis liye|kis lia)\b': [
                "Bas yun hi", "Koi khas wajah nahi", "Zarurat thi",
                "Bad luck yaar", "Pata nahi", "Just because", "Long story hai"
            ],
            
            # Okay/Got it
            r'\b(samajh (gaya|gya|gayi|gai)|got it|clear)\b': [
                "Perfect!", "Acha hai", "Good!", "Nice", "Theek hai phir"
            ],
            
            # Sorry/Apology
            r'\b(sorry|maaf|maafi|apologize)\b': [
                "Koi baat nahi", "It's okay", "Don't worry", "Rehne do",
                "Koi masla nahi", "Forget it", "Chill karo"
            ],
            
            # Help
            r'\b(madad|help|koi (baat|masla|problem))\b': [
                "Haan batao kya chahiye?", "Sure, kaise help karun?", "Zaroor, kya hua?",
                "Koi masla? Batao", "Help kar dunga don't worry"
            ]
        }
        
        # Generic responses for Roman Urdu when no pattern matches
        self.generic_urdu_responses = [
            "Haan theek hai", "Acha!", "Bilkul!", "Okay sure", "Samajh gaya",
            "Nice!", "Sahi hai", "Perfect yaar", "Zaroor", "Done!",
            "Mast!", "Awesome!", "Cool!", "Great!", "Sounds good!"
        ]
    
    def is_roman_urdu(self, text: str) -> bool:
        """Detect if text is likely Roman Urdu based on common words."""
        urdu_words = [
            'kya', 'hai', 'hain', 'ho', 'hun', 'ka', 'ke', 'ki', 'ko', 'se', 'ne',
            'main', 'mein', 'aap', 'tum', 'tha', 'thi', 'the', 'nahi', 'nahin',
            'haan', 'theek', 'shukriya', 'allah', 'kaise', 'kahan', 'kab', 'kyun',
            'acha', 'bilkul', 'bohot', 'bahut', 'abhi', 'phir', 'yaar', 'bhai',
            'dost', 'kar', 'rahe', 'raha', 'kya', 'hai', 'gaya', 'liya', 'mil',
            'salam', 'assalam', 'walaikum', 'ji', 'arey', 'waah', 'kuch', 'koi'
        ]
        
        text_lower = text.lower()
        urdu_word_count = sum(1 for word in urdu_words if f' {word} ' in f' {text_lower} ' or text_lower.startswith(word) or text_lower.endswith(word))
        
        # If 2 or more Urdu words found, likely Roman Urdu
        return urdu_word_count >= 2
    
    def generate_replies(self, input_message: str, num_suggestions: int = 5) -> List[str]:
        """
        Generate smart reply suggestions for the input message.
        
        Args:
            input_message: The message to generate replies for
            num_suggestions: Number of reply suggestions to generate
            
        Returns:
            List of reply suggestions
        """
        if not input_message.strip():
            return ["Please provide a message first."]
        
        is_urdu = self.is_roman_urdu(input_message)
        suggestions = []
        
        if is_urdu:
            # For Roman Urdu, use pattern matching primarily
            suggestions = self._generate_urdu_replies(input_message, num_suggestions)
        else:
            # For English, use model + templates
            suggestions = self._generate_english_replies(input_message, num_suggestions)
        
        # Ensure we have enough unique suggestions
        suggestions = list(dict.fromkeys(suggestions))  # Remove duplicates while preserving order
        
        return suggestions[:num_suggestions]
    
    def _generate_urdu_replies(self, message: str, num_suggestions: int) -> List[str]:
        """Generate replies for Roman Urdu messages using pattern matching."""
        message_lower = message.lower()
        suggestions = []
        
        # Try to match patterns
        for pattern, responses in self.urdu_patterns.items():
            if re.search(pattern, message_lower, re.IGNORECASE):
                # Found a match, add responses from this pattern
                suggestions.extend(responses)
                if len(suggestions) >= num_suggestions:
                    break
        
        # If we don't have enough suggestions, add generic ones
        if len(suggestions) < num_suggestions:
            generic_shuffled = self.generic_urdu_responses.copy()
            random.shuffle(generic_shuffled)
            suggestions.extend(generic_shuffled)
        
        # Remove duplicates and return
        unique_suggestions = []
        for s in suggestions:
            if s not in unique_suggestions:
                unique_suggestions.append(s)
        
        return unique_suggestions[:num_suggestions]
    
    def _generate_english_replies(self, message: str, num_suggestions: int) -> List[str]:
        """Generate replies for English messages using model + templates."""
        suggestions = []
        message_lower = message.lower()
        
        # First try model-based generation
        prompts = [
            f"{message}",
            f"A: {message}\nB:",
            f"Message: {message}\nReply:"
        ]
        
        for i, prompt in enumerate(prompts[:3]):
            try:
                inputs = self.tokenizer.encode(prompt + self.tokenizer.eos_token, return_tensors="pt")
                
                outputs = self.model.generate(
                    inputs,
                    max_length=inputs.shape[1] + 30,
                    num_return_sequences=1,
                    temperature=0.8 + (i * 0.15),
                    top_k=50,
                    top_p=0.9,
                    do_sample=True,
                    pad_token_id=self.tokenizer.eos_token_id,
                    no_repeat_ngram_size=2
                )
                
                response = self.tokenizer.decode(outputs[0], skip_special_tokens=True)
                reply = self._extract_reply(response, prompt)
                
                if reply and len(reply) > 3 and reply not in suggestions:
                    suggestions.append(reply)
                    
            except Exception as e:
                continue
        
        # Add template-based suggestions
        templates = self._get_english_templates(message_lower)
        for template in templates:
            if template not in suggestions and len(suggestions) < num_suggestions:
                suggestions.append(template)
        
        return suggestions
    
    def _extract_reply(self, response: str, prompt: str) -> str:
        """Extract the reply from the model's response."""
        reply = response.replace(prompt, "").strip()
        
        # Take only the first sentence
        if '.' in reply:
            reply = reply.split('.')[0].strip() + '.'
        elif '!' in reply:
            reply = reply.split('!')[0].strip() + '!'
        elif '?' in reply:
            reply = reply.split('?')[0].strip() + '?'
        else:
            reply = reply.split('\n')[0].strip()
        
        # Clean up
        reply = reply.strip()
        
        # Limit length
        if len(reply) > 60:
            reply = reply[:57] + "..."
        
        return reply if reply else ""
    
    def _get_english_templates(self, message_lower: str) -> List[str]:
        """Get template-based English replies."""
        if any(word in message_lower for word in ['how are you', 'how r u', 'sup', 'wassup']):
            return ["I'm good, thanks!", "Doing well, you?", "Great! How about you?", "Pretty good!", "All good here!"]
        elif any(word in message_lower for word in ['thank', 'thanks', 'thx']):
            return ["You're welcome!", "No problem!", "Anytime!", "Happy to help!", "My pleasure!"]
        elif any(word in message_lower for word in ['what are you doing', 'wyd', 'what up', 'whatcha doing']):
            return ["Not much, you?", "Just chilling", "Working right now", "Nothing special", "Just relaxing"]
        elif any(word in message_lower for word in ['meet', 'hangout', 'hang out', 'catch up']):
            return ["Sure! When?", "Sounds good!", "Yeah, let's do it", "I'm free tomorrow", "Count me in!"]
        elif any(word in message_lower for word in ['sorry', 'apologize', 'my bad']):
            return ["It's okay", "No worries", "Don't worry about it", "All good", "Forget it"]
        elif '?' in message_lower:
            return ["Yes, definitely", "Let me check", "Not sure yet", "I'll get back to you", "Maybe later"]
        else:
            return ["Sounds good!", "Okay!", "Got it", "Sure thing", "Alright", "Cool!", "Nice!"]


def main():
    """Main function to run the smart reply system."""
    print("=" * 60)
    print("OFFLINE SMART REPLY SUGGESTION SYSTEM")
    print("Supports English and Roman Urdu")
    print("=" * 60)
    print()
    
    # Initialize the system
    system = SmartReplySystem(model_name="microsoft/DialoGPT-medium")
    
    print("System ready! Type your messages below.")
    print("Type 'quit' or 'exit' to stop.\n")
    
    user_input="Why are you gay"
        
    # Detect language
    is_urdu = system.is_roman_urdu(user_input)
    lang_detected = "Roman Urdu" if is_urdu else "English"
    print(f"[Detected: {lang_detected}]")
        
        # Generate suggestions
    print("\nGenerating suggestions...\n")
    suggestions = system.generate_replies(user_input, num_suggestions=5)
        
        # Display suggestions
    print("📱 SMART REPLY SUGGESTIONS:")
    print()
    for i, suggestion in enumerate(suggestions, 1):
        print(f"  {i}. {suggestion}")
    print()


if __name__ == "__main__":
    main()