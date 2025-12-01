#!/usr/bin/env python3
"""
Deadline Extractor Model
Extracts deadlines and identifies recipients from text messages.
Supports both English and Roman Urdu with continuous learning capabilities.
"""

import re
import json
from datetime import datetime, timedelta
from dateutil.relativedelta import relativedelta
from typing import List, Dict, Optional, Tuple, Union

class EnhancedDeadlineExtractor:
    def __init__(self):
        """Initialize the deadline extractor with comprehensive patterns."""
        
        # Define comprehensive regex patterns for various date formats with named groups
        self.date_patterns = [
            # Common deadline abbreviations (must be first to avoid conflicts)
            (r'\b(EOD|COB|EOW|ASAP|end of day|as soon as possible|end of month|close of business|dopahar|midnight|afternoon|tonight|evening|morning|subah|shaam|subah|dopahar tak)\b', 'deadline_abbreviations'),
            
            # Combined date-time patterns (MUST come before individual patterns to avoid splitting)
            (r'\b(Monday|Tuesday|Wednesday|Thursday|Friday|Saturday|Sunday)\s+(?:at\s+)?(?P<hour>[0-1]?[0-9]|2[0-3]):?(?P<minute>[0-5][0-9])?\s*(?P<period>AM|PM|am|pm|baje)?\b', 'day_time_combined'),
            (r'\b(Monday|Tuesday|Wednesday|Thursday|Friday|Saturday|Sunday)\s+(?:at\s+)?(?P<hour>[0-1]?[0-9]|2[0-3])\s*(?P<period>AM|PM|am|pm|baje)\b', 'day_time_ampm'),
            
            # Tomorrow/today with time
            (r'\b(tomorrow|today|kal|aaj)\s+(?:at\s+)?(?P<hour>[0-1]?[0-9]|2[0-3]):?(?P<minute>[0-5][0-9])?\s*(?P<period>AM|PM|am|pm|baje)?\b', 'relative_time_combined'),
            (r'\b(tomorrow|today|kal|aaj)\s+(?:at\s+)?(?P<hour>[0-1]?[0-9]|2[0-3])\s*(?P<period>AM|PM|am|pm|baje)\b', 'relative_time_ampm'),
            
            # By + context expressions (handle "by tonight", "by evening", etc.)
            (r'\b(by|till|until|tak)\s+(tonight|evening|morning|afternoon|midnight|EOD|COB|end of day|shaam|subah|dopahar|raat)\b', 'by_context_time'),
            
            # Month name with day and time
            (r'\b(?P<month_name>January|February|March|April|May|June|July|August|September|October|November|December)\s+(?P<day>0?[1-9]|[12]\d|3[01])(st|nd|rd|th)?,?\s*(?P<year>\d{4})?\s+(?:at\s+)?(?P<hour>[0-1]?[0-9]|2[0-3]):?(?P<minute>[0-5][0-9])?\s*(?P<period>AM|PM|am|pm)?\b', 'month_day_time'),
            
            # By + time expressions
            (r'\b(by|till|until|tak)\s+(?P<time_expr>(?:(?!\b(?:EOD|COB|EOW|ASAP|end of day|as soon as possible|end of month|close of business|dopahar|midnight|afternoon)\b)[^\s$.,;!?])+)(?=\s|$|[.,;!?])', 'by_time_en'),
            
            # Standard formats
            (r'\b(?P<month>0?[1-9]|1[0-2])[\/\-](?P<day>0?[1-9]|[12]\d|3[01])[\/\-](?P<year>\d{4})\b', 'mm/dd/yyyy'),
            (r'\b(?P<day>0?[1-9]|[12]\d|3[01])[\/\-](?P<month>0?[1-9]|1[0-2])[\/\-](?P<year>\d{4})\b', 'dd/mm/yyyy'),
            (r'\b(?P<month>0?[1-9]|1[0-2])[\/\-](?P<day>0?[1-9]|[12]\d|3[01])[\/\-](?P<year>\d{2})\b', 'mm/dd/yy'),
            (r'\b(?P<day>0?[1-9]|[12]\d|3[01])[\/\-](?P<month>0?[1-9]|1[0-2])[\/\-](?P<year>\d{2})\b', 'dd/mm/yy'),
            
            # Month name formats
            (r'\b(?P<month_name>January|February|March|April|May|June|July|August|September|October|November|December)\s+(?P<day>0?[1-9]|[12]\d|3[01])(st|nd|rd|th)?,?\s*(?P<year>\d{4})\b', 'month_name_day_year'),
            (r'\b(?P<day>0?[1-9]|[12]\d|3[01])(st|nd|rd|th)?\s+(?P<month_name>January|February|March|April|May|June|July|August|September|October|November|December)\s+(?P<year>\d{4})\b', 'day_month_name_year'),
            (r'\b(?P<month_name>January|February|March|April|May|June|July|August|September|October|November|December)\s+(?P<day>0?[1-9]|[12]\d|3[01])(st|nd|rd|th)?\b', 'month_name_day'),
            (r'\b(?P<day>0?[1-9]|[12]\d|3[01])(st|nd|rd|th)?\s+(?P<month_name>January|February|March|April|May|June|July|August|September|October|November|December)\b', 'day_month_name'),
            
            # Time expressions (ONLY standalone, after combined patterns)
            (r'(?<!\b(?:Monday|Tuesday|Wednesday|Thursday|Friday|Saturday|Sunday|tomorrow|today|kal|aaj)\s)(?<!\b(?:January|February|March|April|May|June|July|August|September|October|November|December)\s+\d{1,2}(?:st|nd|rd|th)?,?\s*(?:\d{4}\s+)?)\b(?P<hour>[0-1]?[0-9]|2[0-3]):(?P<minute>[0-5][0-9])\s*(?P<period>AM|PM|am|pm)?\b', 'time_12_24'),
            (r'(?<!\b(?:Monday|Tuesday|Wednesday|Thursday|Friday|Saturday|Sunday|tomorrow|today|kal|aaj)\s)(?<!\b(?:January|February|March|April|May|June|July|August|September|October|November|December)\s+\d{1,2}(?:st|nd|rd|th)?,?\s*(?:\d{4}\s+)?)\b(?P<hour>[0-1]?[0-9]|2[0-3])\s*(?P<period>AM|PM|am|pm)\b', 'time_ampm'),
            
            # Relative dates in English
            (r'\b(tomorrow|today|yesterday)\b', 'relative_en'),
            (r'\b(day after tomorrow|day before yesterday)\b', 'relative_en_extended'),
            
            # Days of the week (ONLY standalone)
            (r'(?<!by\s)(?<!till\s)(?<!until\s)(?<!next\s)(?<!last\s)(?<!this\s)\b(Monday|Tuesday|Wednesday|Thursday|Friday|Saturday|Sunday)\b(?!\s+(?:\d{1,2}|at))', 'day_of_week_en'),
            
            # Next/Last + day in English
            (r'\b(next|last|this)\s+(Monday|Tuesday|Wednesday|Thursday|Friday|Saturday|Sunday)\b(?!\s+(?:\d{1,2}|at))', 'next_last_day_en'),
            
            # Next/This + week/month/year in English
            (r'\b(next|this|last)\s+(week|month|year)\b', 'next_this_last_en'),
            
            # In + time period in English
            (r'\b(in|within)\s+(?P<amount>\d+\.?\d*)\s*(?P<period>days?|weeks?|months?|years?|hours?|minutes?)\b', 'in_period_en'),
            (r'\b(in|within)\s+(?P<text_amount>one|two|three|four|five|six|seven|eight|nine|ten|eleven|twelve|thirteen|fourteen|fifteen|sixteen|seventeen|eighteen|nineteen|twenty)\s*(?P<period>days?|weeks?|months?|years?|hours?|minutes?)\b', 'in_text_period_en'),
        ]
       
        # Keywords that typically precede deadlines in English (with weights for importance)
        self.english_deadline_keywords = {
            'deadline': 1.0, 'due': 0.95, 'submit by': 0.95, 'complete by': 0.92,
            'finish by': 0.92, 'deliver by': 0.9, 'respond by': 0.85, 'reply by': 0.85,
            'turn in by': 0.9, 'assignment due': 0.95, 'project due': 0.95,
            'homework due': 0.92, 'report due': 0.92, 'paper due': 0.92, 'exam due': 0.95,
            'quiz due': 0.9, 'test due': 0.9, 'final due': 0.95, 'presentation due': 0.92,
            'proposal due': 0.92, 'application due': 0.92, 'required by': 0.9,
            'expected by': 0.85, 'needed by': 0.85, 'must be submitted': 0.95,
            'must be completed': 0.92, 'must finish': 0.92, 'must deliver': 0.9,
            'should be submitted': 0.85, 'should be completed': 0.82,
            'target date': 0.8, 'target': 0.75, 'cutoff': 0.8, 'cut off': 0.8,
            'last date': 0.9, 'final date': 0.85, 'end date': 0.8,
            'expiration date': 0.85, 'expiry date': 0.85, 'expires': 0.8,
            'payment due': 0.9, 'bill due': 0.9, 'rent due': 0.9,
            'subscription ends': 0.85, 'membership expires': 0.85,
            # Additional keywords for better context detection
            'submit': 0.9, 'jama': 0.9, 'karna': 0.8, 'karni': 0.8, 'dena': 0.8,
            'required': 0.85, 'require': 0.85, 'payment': 0.85, 'assignment': 0.8,
            'report': 0.8, 'documents': 0.7, 'ensure': 0.7, 'please': 0.6,
            # Action verbs for deadlines
            'finish': 0.85, 'complete': 0.85, 'done': 0.85, 'end': 0.8,
            'must': 0.9, 'should': 0.8, 'gotta': 0.8, 'send': 0.8, 'turn in': 0.8,
            'deliver': 0.8, 'provide': 0.75, 'give': 0.7,
            # Deadline abbreviations
            'eod': 0.9, 'cob': 0.9, 'eow': 0.85, 'asap': 0.8,
            # Roman Urdu context keywords
            'jama karna': 0.95, 'submit karna': 0.9, 'payment karni': 0.85,
            'assignment jama': 0.8, 'report jama': 0.9, 'kal submit': 0.9,
            'aaj se pehle': 0.8, 'agla monday': 0.8, 'parso tak': 0.8,
            'sare documents': 0.7, 'jama karna honge': 0.95,
            # Enhanced context keywords
            'report submit': 0.95, 'jama karna hai': 0.99,
            'aaj se pehle jama': 0.99, 'jama karna': 0.99,
            'within seven days jama': 0.99, 'jama': 0.99,
            # Time context keywords
            'by': 0.85, 'until': 0.8, 'till': 0.8, 'ends': 0.8,
            # Additional time context
            'at': 0.7, 'sharp': 0.7, 'noon': 0.8, 'midnight': 0.8,
            'dopahar': 0.8, 'subah': 0.8, 'shaam': 0.8,
            # Negative context keywords (lower confidence for non-deadline contexts)
            'born': 0.2, 'birth': 0.2, 'graduated': 0.2, 'graduation': 0.2,
            'started': 0.2, 'begin': 0.2, 'was': 0.2, 'were': 0.2,
            # Very specific negative contexts
            'i graduated': 0.1, 'i was born': 0.1,
            # Additional context keywords for better detection
            'needs to be': 0.9, 'has to be': 0.9, 'scheduled for': 0.85, 'set for': 0.85,
            'planned for': 0.85, 'intended for': 0.8, 'meant for': 0.8,
            'evaluation': 0.8, 'appraisal': 0.8, 'assessment': 0.8,
            'review': 0.8, 'analysis': 0.75, 'study': 0.75,
            'delivery': 0.85, 'shipment': 0.8, 'package': 0.75,
            'order': 0.8, 'purchase': 0.8, 'buy': 0.75, 'sale': 0.8, 'sell': 0.75,
            'contract': 0.8, 'agreement': 0.8, 'deal': 0.75, 'transaction': 0.75,
            'payment': 0.85, 'invoice': 0.8, 'bill': 0.8,
            'salary': 0.8, 'wage': 0.8, 'pay': 0.8, 'income': 0.75,
            'reporting': 0.8, 'filing': 0.8, 'submission': 0.9,
            'audit': 0.8, 'inspection': 0.8,
            'compliance': 0.8, 'regulation': 0.75, 'policy': 0.75, 'procedure': 0.75,
            'process': 0.75, 'method': 0.7, 'technique': 0.7, 'approach': 0.7,
            'strategy': 0.7, 'tactic': 0.7, 'plan': 0.8, 'planning': 0.8,
            'forecast': 0.75, 'prediction': 0.75, 'estimate': 0.75,
            'calculation': 0.7, 'computation': 0.7, 'analysis': 0.75,
            'examination': 0.75, 'investigation': 0.75, 'research': 0.75,
            'study': 0.75, 'exploration': 0.7, 'discovery': 0.7, 'finding': 0.7,
            'result': 0.7, 'outcome': 0.7, 'conclusion': 0.7, 'decision': 0.7,
            'choice': 0.7, 'option': 0.7, 'alternative': 0.7,
            'solution': 0.7, 'answer': 0.7, 'response': 0.7, 'reply': 0.7,
            'reaction': 0.7, 'feedback': 0.7, 'comment': 0.7,
            'suggestion': 0.7, 'recommendation': 0.7, 'advice': 0.7,
            'guidance': 0.7, 'instruction': 0.7, 'direction': 0.7,
            'command': 0.7, 'order': 0.7, 'request': 0.8, 'demand': 0.8,
            'requirement': 0.85, 'need': 0.8, 'necessity': 0.8,
            'obligation': 0.8, 'duty': 0.8, 'responsibility': 0.8,
            'liability': 0.75, 'accountability': 0.75, 'authority': 0.7,
            'power': 0.7, 'control': 0.7, 'influence': 0.7, 'impact': 0.7,
            'effect': 0.7, 'consequence': 0.7, 'issue': 0.7,
            'problem': 0.7, 'challenge': 0.7, 'difficulty': 0.7,
            'obstacle': 0.7, 'barrier': 0.7, 'hindrance': 0.7,
            'delay': 0.7, 'postponement': 0.7, 'cancellation': 0.7,
            'termination': 0.7, 'conclusion': 0.7, 'ending': 0.7,
            'finish': 0.8, 'completion': 0.85, 'achievement': 0.8,
            'accomplishment': 0.8, 'success': 0.7, 'victory': 0.7,
            'win': 0.7, 'defeat': 0.7, 'loss': 0.7, 'failure': 0.7,
            'mistake': 0.7, 'error': 0.7, 'fault': 0.7, 'blame': 0.7,
            'commitment': 0.8, 'promise': 0.7, 'pledge': 0.7, 'vow': 0.7,
            'oath': 0.7, 'swear': 0.7, 'guarantee': 0.7, 'warranty': 0.7,
            'assurance': 0.7, 'insurance': 0.7, 'protection': 0.7,
            'security': 0.7, 'safety': 0.7, 'health': 0.7, 'wellness': 0.7,
            'fitness': 0.7, 'exercise': 0.7, 'workout': 0.7, 'training': 0.8,
            'education': 0.7, 'learning': 0.7, 'teaching': 0.7, 'instruction': 0.7,
            'school': 0.7, 'college': 0.7, 'university': 0.7, 'institute': 0.7,
            'academy': 0.7, 'faculty': 0.7, 'department': 0.7,
            'division': 0.7, 'section': 0.7, 'unit': 0.7, 'branch': 0.7,
            'office': 0.7, 'team': 0.8, 'group': 0.7, 'committee': 0.7,
            'board': 0.7, 'council': 0.7, 'commission': 0.7, 'assembly': 0.7,
            'congress': 0.7, 'parliament': 0.7, 'senate': 0.7, 'house': 0.7,
            'court': 0.7, 'tribunal': 0.7, 'jury': 0.7, 'panel': 0.7,
            'forum': 0.7, 'conference': 0.8, 'seminar': 0.7, 'workshop': 0.7,
            'symposium': 0.7, 'summit': 0.7, 'meeting': 0.8, 'gathering': 0.7,
            'assembly': 0.7, 'celebration': 0.7, 'party': 0.7, 'event': 0.7,
            'occasion': 0.7, 'ceremony': 0.7, 'ritual': 0.7, 'tradition': 0.7,
            'custom': 0.7, 'practice': 0.7, 'habit': 0.7, 'routine': 0.7,
            'schedule': 0.8, 'timetable': 0.7, 'agenda': 0.8,
            'program': 0.7, 'programme': 0.7, 'curriculum': 0.7, 'syllabus': 0.7,
            'course': 0.7, 'class': 0.7, 'lesson': 0.7,
            'lecture': 0.7, 'talk': 0.7, 'speech': 0.7, 'address': 0.7,
            'presentation': 0.8, 'performance': 0.8, 'show': 0.7,
            'display': 0.7, 'exhibition': 0.7, 'exhibit': 0.7,
            'demonstration': 0.7, 'demo': 0.7, 'sample': 0.7, 'example': 0.7,
            'illustration': 0.7, 'instance': 0.7, 'case': 0.7,
            'situation': 0.7, 'circumstance': 0.7, 'condition': 0.7,
            'state': 0.7, 'status': 0.7, 'position': 0.7, 'rank': 0.7,
            'level': 0.7, 'grade': 0.7, 'class': 0.7, 'category': 0.7,
            'type': 0.7, 'kind': 0.7, 'sort': 0.7, 'variety': 0.7,
            'form': 0.7, 'version': 0.7, 'edition': 0.7, 'release': 0.7,
            'update': 0.7, 'upgrade': 0.7, 'improvement': 0.7,
            'enhancement': 0.7, 'modification': 0.7, 'change': 0.7,
            'revision': 0.7, 'correction': 0.7, 'adjustment': 0.7,
            'adaptation': 0.7, 'alteration': 0.7,
            'transformation': 0.7, 'conversion': 0.7, 'transition': 0.7,
            'shift': 0.7, 'move': 0.7, 'transfer': 0.7, 'exchange': 0.7,
            'substitution': 0.7, 'replacement': 0.7, 'substitute': 0.7,
            'alternative': 0.7, 'option': 0.7, 'choice': 0.7,
            'selection': 0.7, 'pick': 0.7, 'preference': 0.7, 'favor': 0.7,
            'support': 0.7, 'endorsement': 0.7, 'approval': 0.7,
            'acceptance': 0.7, 'agreement': 0.7, 'consent': 0.7,
            'permission': 0.7, 'authorization': 0.7, 'license': 0.7,
            'permit': 0.7, 'certificate': 0.7, 'diploma': 0.7, 'degree': 0.7,
            'qualification': 0.7, 'credential': 0.7,
            'certification': 0.7, 'accreditation': 0.7, 'validation': 0.7,
            'verification': 0.7, 'confirmation': 0.7,
            'authentication': 0.7, 'endorsement': 0.7, 'ratification': 0.7,
            'sanction': 0.7, 'approval': 0.7, 'consent': 0.7
        }
        
        # Roman Urdu to English translation mappings
        self.urdu_to_english_map = {
            # Relative dates
            'kal': 'tomorrow',
            'aaj': 'today',
            'parso': 'day after tomorrow',
            'kal se pehle': 'yesterday',
            'parson kal': 'day after tomorrow',
            
            # Days of week
            'Monday': 'Monday',
            'Tuesday': 'Tuesday',
            'Wednesday': 'Wednesday',
            'Thursday': 'Thursday',
            'Friday': 'Friday',
            'Saturday': 'Saturday',
            'Sunday': 'Sunday',
            # Roman Urdu days
            'Somvar': 'Monday',
            'Mangal': 'Tuesday',
            'Budh': 'Wednesday',
            'Jumeraat': 'Thursday',
            'Juma': 'Friday',
            'Hafta': 'Saturday',
            'Itwar': 'Sunday',
            
            # Time periods
            'agla': 'next',
            'agle': 'next',
            'pichla': 'last',
            'ye': 'this',
            'hafta': 'week',
            'mahina': 'month',
            'mahine': 'month',
            'saal': 'year',
            
            # Time expressions
            'mein': 'in',
            'andar': 'within',
            'din': 'days',
            'dino': 'days',
            'haftay': 'weeks',
            'mahinay': 'months',
            'ghante': 'hours',
            'ghanton': 'hours',
            'minute': 'minutes',
            'min': 'minutes',
            'kal': 'tomorrow',
            'aaj': 'today',
            'parso': 'day after tomorrow',
            'kal se pehle': 'yesterday',
            'parson kal': 'day after tomorrow',
            'raat': 'tonight',
            'shaam': 'evening',
            'subah': 'morning',
            'dopahar': 'afternoon',
            'baje': 'AM',  # or PM depending on context
            'tak': 'by',
            
            # Prepositions
            'tak': 'by',
            'pehle': 'before',
            'baad': 'after',
            
            # Seasons
            'bahar': 'spring',
            'garmi': 'summer',
            'kharif': 'fall',
            'sardi': 'winter',
            
            # Academic terms
            'tarmim': 'term',
            'mosam': 'semester',
            
            # Fiscal terms
            'mali saal': 'fiscal year',
            
            # Deadline keywords
            'jama karna': 'submit',
            'jama karna hai': 'submit',
            'mukhatam karna': 'complete',
            'turn in karna': 'submit',
            'zarurat hai': 'required',
            'mangte hain': 'needed',
            'dena hai': 'required',
            'karna hai': 'to do',
            'karni hai': 'to do',
            'jama hona': 'submission',
            'mukhatam hona': 'completion',
            'akhri tareekh': 'last date',
            'antim tareekh': 'final date',
            'khatam hone ki tareekh': 'expiration date',
            'khatam hone ka waqt': 'expiration time',
            'waqt khatam': 'time expires',
            'muddat khatam': 'deadline',
            'adai karni hai': 'payment due',
            'ada karna': 'pay',
            # Additional mappings
            'hogi': 'will be',
            'honge': 'will be',
            'taiyar': 'ready',
            'ki jaegi': 'will be done',
            'sare': 'all',
            'documents': 'documents',
            # Roman Urdu numbers
            'ek': 'one',
            'do': 'two',
            'teen': 'three',
            'chaar': 'four',
            'paanch': 'five',
            'chhe': 'six',
            'saat': 'seven',
            'aath': 'eight',
            'nau': 'nine',
            'das': 'ten',
            'gyarah': 'eleven',
            'barah': 'twelve',
            'terah': 'thirteen',
            'chaudah': 'fourteen',
            'pandrah': 'fifteen',
            'solah': 'sixteen',
            'satrah': 'seventeen',
            'atharah': 'eighteen',
            'unnais': 'nineteen',
            'bees': 'twenty',
            # Common phrase mappings
            'kal submit karna hai': 'submit tomorrow',
            'aaj se pehle jama karna hai': 'submit today',
            'agla monday tak assignment jama karni hai': 'submit assignment next monday',
            'parso tak payment karni hai': 'make payment day after tomorrow',
            'sare documents within seven days jama karna honge': 'all documents will be submitted within seven days',
            # Roman Urdu abbreviations
            'eod': 'end of day',
            'asap': 'as soon as possible',
            # Additional Roman Urdu terms
            'close of business': 'end of day',
            'dopahar': 'afternoon',
            'midnight': 'midnight'
        }
        
        # Month name to number mapping (English)
        self.month_map = {
            'january': 1, 'february': 2, 'march': 3, 'april': 4,
            'may': 5, 'june': 6, 'july': 7, 'august': 8,
            'september': 9, 'october': 10, 'november': 11, 'december': 12
        }
        
        # Season to month mapping
        self.season_map = {
            'spring': 3, 'summer': 6, 'fall': 9, 'autumn': 9, 'winter': 12,
            'bahar': 3, 'garmi': 6, 'kharif': 9, 'sardi': 12
        }
        
        # Days of week mapping
        self.day_map = {
            'monday': 0, 'tuesday': 1, 'wednesday': 2, 'thursday': 3,
            'friday': 4, 'saturday': 5, 'sunday': 6
        }
        
        # Text to number mapping
        self.text_number_map = {
            'one': 1, 'two': 2, 'three': 3, 'four': 4, 'five': 5,
            'six': 6, 'seven': 7, 'eight': 8, 'nine': 9, 'ten': 10,
            'eleven': 11, 'twelve': 12, 'thirteen': 13, 'fourteen': 14, 'fifteen': 15,
            'sixteen': 16, 'seventeen': 17, 'eighteen': 18, 'nineteen': 19, 'twenty': 20
        }
        
        # Use only English keywords since we're translating Urdu to English
        self.deadline_keywords = self.english_deadline_keywords
        
        # Learning database for recipient detection
        self.recipient_patterns = {}
        self.conversation_history = []
    
    def translate_urdu_to_english(self, text: str) -> str:
        """Translate Roman Urdu text to English for better deadline detection."""
        translated_text = text
        
        # Handle special cases for time expressions first
        # Handle "X din/mein" -> "in X days"
        translated_text = re.sub(r'\b(\d+)\s+(din)\s+(mein)\b', r'in \1 days', translated_text, flags=re.IGNORECASE)
        translated_text = re.sub(r'\b(\d+)\s+(haftay?)\s+(mein)\b', r'in \1 weeks', translated_text, flags=re.IGNORECASE)
        translated_text = re.sub(r'\b(\d+)\s+(mahinay?)\s+(mein)\b', r'in \1 months', translated_text, flags=re.IGNORECASE)
        translated_text = re.sub(r'\b(\d+)\s+(ghante?)\s+(mein)\b', r'in \1 hours', translated_text, flags=re.IGNORECASE)
        translated_text = re.sub(r'\b(\d+)\s+(minute)\s+(mein)\b', r'in \1 minutes', translated_text, flags=re.IGNORECASE)
        
        # Handle "mein X din" -> "in X days"
        translated_text = re.sub(r'\b(mein)\s+(\d+)\s+(din)\b', r'in \2 days', translated_text, flags=re.IGNORECASE)
        translated_text = re.sub(r'\b(mein)\s+(\d+)\s+(haftay?)\b', r'in \2 weeks', translated_text, flags=re.IGNORECASE)
        translated_text = re.sub(r'\b(mein)\s+(\d+)\s+(mahinay?)\b', r'in \2 months', translated_text, flags=re.IGNORECASE)
        translated_text = re.sub(r'\b(mein)\s+(\d+)\s+(ghante?)\b', r'in \2 hours', translated_text, flags=re.IGNORECASE)
        translated_text = re.sub(r'\b(mein)\s+(\d+)\s+(minute)\b', r'in \2 minutes', translated_text, flags=re.IGNORECASE)
        
        # Sort keys by length (descending) to replace longer phrases first
        sorted_keys = sorted(self.urdu_to_english_map.keys(), key=len, reverse=True)
        
        for urdu_phrase in sorted_keys:
            english_phrase = self.urdu_to_english_map[urdu_phrase]
            # Use word boundaries to avoid partial replacements
            pattern = r'\b' + re.escape(urdu_phrase) + r'\b'
            translated_text = re.sub(pattern, english_phrase, translated_text, flags=re.IGNORECASE)
        
        return translated_text
    
    def extract_dates_regex(self, text: str) -> List[Dict]:
        """Extract dates using comprehensive regex patterns with enhanced matching."""
        # First translate any Roman Urdu to English
        translated_text = self.translate_urdu_to_english(text)
        
        dates = []
        for pattern, pattern_type in self.date_patterns:
            for match in re.finditer(pattern, translated_text, re.IGNORECASE):
                dates.append({
                    'text': match.group(),
                    'start': match.start(),
                    'end': match.end(),
                    'pattern_type': pattern_type,
                    'groups': match.groupdict() if match.groups() else {}
                })
        return dates
    
    def parse_absolute_date(self, date_info: Dict) -> Optional[datetime]:
        """Parse absolute date strings into datetime objects."""
        pattern_type = date_info['pattern_type']
        groups = date_info['groups']
        
        try:
            if pattern_type in ['day_time_combined', 'day_time_ampm', 'relative_time_combined', 'relative_time_ampm', 'month_day_time']:
                return self.parse_combined_datetime(date_info)
            
            # Handle context-based time expressions
            if pattern_type == 'by_context_time':
                return self.parse_context_time(date_info)
            
            if pattern_type in ['mm/dd/yyyy', 'dd/mm/yyyy']:
                if pattern_type == 'mm/dd/yyyy':
                    month = int(groups['month'])
                    day = int(groups['day'])
                else:  # dd/mm/yyyy
                    day = int(groups['day'])
                    month = int(groups['month'])
                year = int(groups['year'])
                return datetime(year, month, day)
            
            elif pattern_type in ['mm/dd/yy', 'dd/mm/yy']:
                if pattern_type == 'mm/dd/yy':
                    month = int(groups['month'])
                    day = int(groups['day'])
                else:  # dd/mm/yy
                    day = int(groups['day'])
                    month = int(groups['month'])
                year = int(groups['year'])
                # Handle 2-digit years
                if year < 50:
                    year += 2000
                else:
                    year += 1900
                return datetime(year, month, day)
            
            elif pattern_type in ['month_name_day_year', 'day_month_name_year']:
                if 'month_name' in groups:
                    month_name = groups['month_name'].lower()
                    month = self.month_map[month_name]
                else:
                    month = int(groups['month']) if groups['month'].isdigit() else 1
                
                day = int(groups['day'])
                year = int(groups['year'])
                return datetime(year, month, day)
            
            elif pattern_type in ['month_name_day', 'day_month_name']:
                if 'month_name' in groups:
                    month_name = groups['month_name'].lower()
                    month = self.month_map[month_name]
                else:
                    month = int(groups['month']) if groups['month'].isdigit() else 1
                
                day = int(groups['day'])
                # Assume current year
                year = datetime.now().year
                return datetime(year, month, day)
            
            elif pattern_type == 'time_12_24':
                # Time-only expressions don't have a date
                return None
            
            elif pattern_type == 'time_ampm':
                # Time-only expressions don't have a date
                return None
            
            elif pattern_type == 'time_ampm_simple':
                # Time-only expressions don't have a date
                return None
            
            elif pattern_type == 'time_context_simple':
                # Time-only expressions don't have a date
                return None
            
            elif pattern_type == 'relative_en':
                text = date_info['text'].lower()
                today = datetime.now().replace(hour=0, minute=0, second=0, microsecond=0)
                if text == 'tomorrow':
                    return today + timedelta(days=1)
                elif text == 'today':
                    return today
                elif text == 'yesterday':
                    return today - timedelta(days=1)
                return None
            
            elif pattern_type == 'relative_en_extended':
                text = date_info['text'].lower()
                today = datetime.now().replace(hour=0, minute=0, second=0, microsecond=0)
                if text == 'day after tomorrow':
                    return today + timedelta(days=2)
                elif text == 'day before yesterday':
                    return today - timedelta(days=2)
                return None
            
            elif pattern_type == 'day_of_week_en':
                day_name = date_info['text']
                target_day = self.day_map[day_name.lower()]
                today = datetime.now()
                days_ahead = target_day - today.weekday()
                if days_ahead <= 0:  # Target day already happened this week
                    days_ahead += 7
                return today + timedelta(days_ahead)
            
            elif pattern_type == 'next_last_day_en':
                text = date_info['text'].lower()
                words = text.split()
                modifier = words[0]  # next, last, this
                day_name = words[1]   # Monday, Tuesday, etc.
                target_day = self.day_map[day_name.lower()]
                today = datetime.now()
                current_day = today.weekday()
                
                if modifier == 'next':
                    days_ahead = target_day - current_day
                    if days_ahead <= 0:  # Target day already happened this week
                        days_ahead += 7
                    return today + timedelta(days_ahead)
                elif modifier == 'last':
                    days_behind = current_day - target_day
                    if days_behind <= 0:  # Target day hasn't happened this week yet
                        days_behind += 7
                    return today - timedelta(days_behind)
                elif modifier == 'this':
                    days_ahead = target_day - current_day
                    return today + timedelta(days_ahead)
                return None
            
            elif pattern_type == 'day_next_last_en':
                text = date_info['text'].lower()
                words = text.split()
                day_name = words[0]   # Monday, Tuesday, etc.
                modifier = words[1]   # next, last
                target_day = self.day_map[day_name.lower()]
                today = datetime.now()
                current_day = today.weekday()
                
                if modifier == 'next':
                    days_ahead = target_day - current_day
                    if days_ahead <= 0:  # Target day already happened this week
                        days_ahead += 7
                    return today + timedelta(days_ahead)
                elif modifier == 'last':
                    days_behind = current_day - target_day
                    if days_behind <= 0:  # Target day hasn't happened this week yet
                        days_behind += 7
                    return today - timedelta(days_behind)
                return None
            
            elif pattern_type == 'next_this_last_en':
                text = date_info['text'].lower()
                words = text.split()
                modifier = words[0]  # next, this, last
                period = words[1]    # week, month, year
                
                today = datetime.now()
                if period == 'week':
                    if modifier == 'next':
                        days_ahead = 7 - today.weekday()
                        return today + timedelta(days=days_ahead)
                    elif modifier == 'this':
                        days_ahead = 0 - today.weekday()
                        return today + timedelta(days=days_ahead)
                    elif modifier == 'last':
                        days_behind = today.weekday() + 7
                        return today - timedelta(days=days_behind)
                elif period == 'month':
                    if modifier == 'next':
                        if today.month == 12:
                            return today.replace(year=today.year + 1, month=1, day=1)
                        else:
                            return today.replace(month=today.month + 1, day=1)
                    elif modifier == 'this':
                        return today.replace(day=1)
                    elif modifier == 'last':
                        if today.month == 1:
                            return today.replace(year=today.year - 1, month=12, day=1)
                        else:
                            return today.replace(month=today.month - 1, day=1)
                elif period == 'year':
                    if modifier == 'next':
                        return today.replace(year=today.year + 1, month=1, day=1)
                    elif modifier == 'this':
                        return today.replace(month=1, day=1)
                    elif modifier == 'last':
                        return today.replace(year=today.year - 1, month=1, day=1)
                return None
            
            elif pattern_type == 'period_next_last_en':
                text = date_info['text'].lower()
                words = text.split()
                period = words[0]     # week, month, year
                modifier = words[1]   # next, last
                
                today = datetime.now()
                if period == 'week':
                    if modifier == 'next':
                        days_ahead = 7 - today.weekday()
                        return today + timedelta(days=days_ahead)
                    elif modifier == 'last':
                        days_behind = today.weekday() + 7
                        return today - timedelta(days=days_behind)
                elif period == 'month':
                    if modifier == 'next':
                        if today.month == 12:
                            return today.replace(year=today.year + 1, month=1, day=1)
                        else:
                            return today.replace(month=today.month + 1, day=1)
                    elif modifier == 'last':
                        if today.month == 1:
                            return today.replace(year=today.year - 1, month=12, day=1)
                        else:
                            return today.replace(month=today.month - 1, day=1)
                elif period == 'year':
                    if modifier == 'next':
                        return today.replace(year=today.year + 1, month=1, day=1)
                    elif modifier == 'last':
                        return today.replace(year=today.year - 1, month=1, day=1)
                return None
            
            elif pattern_type in ['in_period_en', 'in_period_en_float', 'within_period_en', 'within_period_en_float']:
                # These are relative time periods
                return None
            
            elif pattern_type in ['in_text_period_en', 'within_text_period_en']:
                # These are relative time periods with text amounts
                return None
            
            elif pattern_type == 'by_time_en':
                # "by" expressions don't have a specific date without context
                return None
            
            elif pattern_type == 'day_month_numeric':
                day = int(groups['day'])
                month = int(groups['month'])
                year = datetime.now().year
                return datetime(year, month, day)
            
            elif pattern_type == 'month_day_numeric':
                month = int(groups['month'])
                day = int(groups['day'])
                year = datetime.now().year
                return datetime(year, month, day)
            
            elif pattern_type == 'year_only':
                year = int(groups['year'])
                return datetime(year, 1, 1)
            
            elif pattern_type == 'season_year_en':
                season = groups['season'].lower()
                year = int(groups['year'])
                month = self.season_map[season]
                return datetime(year, month, 1)
            
            elif pattern_type == 'academic_term_en':
                # Simplified handling
                year = int(groups['year']) if groups['year'] else datetime.now().year
                return datetime(year, 1, 1)
            
            elif pattern_type == 'fiscal_year_en':
                year = int(groups['year']) if groups['year'] else datetime.now().year
                return datetime(year, 1, 1)
            
            elif pattern_type == 'deadline_abbreviations':
                # Abbreviations don't have specific dates
                return None
            
        except (ValueError, KeyError):
            # If parsing fails, return None
            return None
        
        return None
    
    def parse_relative_date(self, date_text: str) -> Optional[datetime]:
        """Parse relative date expressions like 'in 5 days' or 'within two weeks'."""
        # First translate any Roman Urdu to English
        translated_text = self.translate_urdu_to_english(date_text).lower()
        
        # Handle "in X days/weeks/months" patterns
        in_pattern = r'\b(in|within)\s+(?P<amount>\d+\.?\d*)\s*(?P<period>days?|weeks?|months?|years?|hours?|minutes?)\b'
        match = re.search(in_pattern, translated_text, re.IGNORECASE)
        
        if match:
            amount = int(float(match.group('amount')))  # Convert to int
            period = match.group('period').lower().rstrip('s')  # Remove plural 's'
            
            today = datetime.now().replace(hour=0, minute=0, second=0, microsecond=0)
            
            if period == 'day':
                return today + timedelta(days=amount)
            elif period == 'week':
                return today + timedelta(weeks=amount)
            elif period == 'month':
                return today + relativedelta(months=amount)
            elif period == 'year':
                return today + relativedelta(years=amount)
            elif period == 'hour':
                return today + timedelta(hours=amount)
            elif period == 'minute':
                return today + timedelta(minutes=amount)
        
        # Handle text-based amounts like "in two weeks"
        text_pattern = r'\b(in|within)\s+(?P<text_amount>one|two|three|four|five|six|seven|eight|nine|ten|eleven|twelve|thirteen|fourteen|fifteen|sixteen|seventeen|eighteen|nineteen|twenty)\s*(?P<period>days?|weeks?|months?|years?|hours?|minutes?)\b'
        match = re.search(text_pattern, translated_text, re.IGNORECASE)
        
        if match:
            text_amount = match.group('text_amount').lower()
            amount = self.text_number_map[text_amount]
            period = match.group('period').lower().rstrip('s')  # Remove plural 's'
            
            today = datetime.now().replace(hour=0, minute=0, second=0, microsecond=0)
            
            if period == 'day':
                return today + timedelta(days=amount)
            elif period == 'week':
                return today + timedelta(weeks=amount)
            elif period == 'month':
                return today + relativedelta(months=amount)
            elif period == 'year':
                return today + relativedelta(years=amount)
            elif period == 'hour':
                return today + timedelta(hours=amount)
            elif period == 'minute':
                return today + timedelta(minutes=amount)
        
        return None
    
    def parse_combined_datetime(self, date_info: Dict) -> Optional[datetime]:
        """Parse combined date-time expressions like 'Monday 10 AM' or 'tomorrow 3:30 PM'."""
        pattern_type = date_info['pattern_type']
        groups = date_info['groups']
        text = date_info['text'].lower()
        
        try:
            # Extract time components
            hour = int(groups.get('hour', 0))
            minute = int(groups.get('minute', 0))
            period = groups.get('period', '').upper()
            
            # Convert to 24-hour format if needed
            if period in ['PM', 'pm'] and hour != 12:
                hour += 12
            elif period in ['AM', 'am'] and hour == 12:
                hour = 0
            
            # Determine the base date
            base_date = None
            
            if pattern_type in ['day_time_combined', 'day_time_ampm']:
                # Extract day name from the match
                day_match = re.search(r'\b(Monday|Tuesday|Wednesday|Thursday|Friday|Saturday|Sunday)\b', date_info['text'], re.IGNORECASE)
                if day_match:
                    day_name = day_match.group(1).lower()
                    target_day = self.day_map[day_name]
                    today = datetime.now()
                    days_ahead = target_day - today.weekday()
                    if days_ahead <= 0:
                        days_ahead += 7
                    base_date = today + timedelta(days_ahead)
            
            elif pattern_type in ['relative_time_combined', 'relative_time_ampm']:
                # Extract relative word (tomorrow/today/kal/aaj)
                relative_match = re.search(r'\b(tomorrow|today|kal|aaj)\b', text, re.IGNORECASE)
                if relative_match:
                    relative_word = relative_match.group(1).lower()
                    today = datetime.now()
                    if relative_word in ['tomorrow', 'kal']:
                        base_date = today + timedelta(days=1)
                    elif relative_word in ['today', 'aaj']:
                        base_date = today
            
            elif pattern_type == 'month_day_time':
                # Handle month + day + time
                if 'month_name' in groups:
                    month_name = groups['month_name'].lower()
                    month = self.month_map[month_name]
                else:
                    month = int(groups['month'])
                
                day = int(groups['day'])
                year = int(groups['year']) if groups.get('year') else datetime.now().year
                base_date = datetime(year, month, day)
            
            if base_date:
                # Combine date with time
                return base_date.replace(hour=hour, minute=minute, second=0, microsecond=0)
            
        except (ValueError, KeyError):
            pass
        
        return None
    
    def parse_context_time(self, date_info: Dict) -> Optional[datetime]:
        """Parse context-based time expressions like 'by tonight' or 'by evening'."""
        text = date_info['text'].lower()
        today = datetime.now()
        
        # Define time mappings for different contexts
        time_contexts = {
            'tonight': (today, 23, 59),  # End of today
            'evening': (today, 18, 0),   # 6 PM today
            'shaam': (today, 18, 0),      # 6 PM today
            'afternoon': (today, 15, 0),  # 3 PM today
            'dopahar': (today, 14, 0),    # 2 PM today
            'morning': (today, 9, 0),     # 9 AM today
            'subah': (today, 9, 0),       # 9 AM today
            'midnight': (today, 23, 59),  # End of today
            'raat': (today, 23, 59),      # End of today
            'eod': (today, 17, 0),        # 5 PM today
            'cob': (today, 17, 0),        # 5 PM today
            'end of day': (today, 17, 0), # 5 PM today
        }
        
        for context_word, (base_date, hour, minute) in time_contexts.items():
            if context_word in text:
                return base_date.replace(hour=hour, minute=minute, second=0, microsecond=0)
        
        return None
    
    def find_deadline_context(self, text: str, date_start: int, date_length: int) -> Tuple[Optional[str], float]:
        """
        Find the context around a date to determine if it's a deadline.
        Returns a tuple of (context_word, confidence_score).
        """
        # Define search window around the date
        window_start = max(0, date_start - 20)
        window_end = min(len(text), date_start + date_length + 20)
        context_text = text[window_start:window_end].lower()
        
        # Look for deadline keywords in the context
        best_context = None
        best_confidence = 0.0
        
        for keyword, confidence in self.deadline_keywords.items():
            if keyword in context_text:
                # Check if this is a better match (higher confidence)
                if confidence > best_confidence:
                    best_context = keyword
                    best_confidence = confidence
        
        return (best_context, best_confidence)
    
    def find_deadline_recipient(self, text: str, sender_name: Optional[str] = None, conversation_context: Optional[List[str]] = None) -> Optional[str]:
        """Find the recipient of a deadline - who it's directed to."""
        # First translate any Roman Urdu to English
        translated_text = self.translate_urdu_to_english(text).lower()
        original_text = text.lower()
        
        # Combine original and translated text for better detection
        combined_text = f"{original_text} {translated_text}".strip()
        
        # Check for formal address patterns like "Dear [Name]" (this should be checked first)
        # Handle both English and Roman Urdu variations
        dear_match = re.search(r'\bdear\s+([A-Z][a-z]+)', text, re.IGNORECASE)
        if not dear_match:
            # Try to find "Dear" in translated text
            dear_match = re.search(r'\bdear\s+([A-Z][a-z]+)', translated_text, re.IGNORECASE)
        
        if dear_match:
            name = dear_match.group(1)
            if name != sender_name:  # Not the sender
                return name.capitalize()  # Return properly capitalized name
        
        # Check for possessive forms that might indicate recipient (check before general name detection)
        possessive_match = re.search(r'\b([A-Z][a-z]+)\'s\b', text)
        if possessive_match:
            name = possessive_match.group(1)
            if name != sender_name:  # Not the sender
                return name.capitalize()
        
        # Check if message starts with a specific name (addressed to someone)
        words = text.split() if text else []
        if words:
            first_word = words[0].rstrip('.,!?;:')
            # If first word is a name (capitalized, not common words, not sender)
            # Exclude common non-name words
            excluded_words = [
                'please', 'you', 'your', 'the', 'a', 'an', 'this', 'that', 'these', 'those', 
                'dear', 'meeting', 'meetings', 'call', 'calls', 'appointment', 'appointments',
                'no', 'just', 'great', 'all', 'team', 'performance', 'project', 'report', 
                'presentation', 'document', 'assignment', 'documents', 'review', 'reviews',
                'proposal', 'proposals', 'budget', 'budgets', 'plan', 'plans', 'schedule',
                'schedules', 'agenda', 'agendas', 'minutes', 'tasks', 'task', 'work', 'works',
                'job', 'jobs', 'duty', 'duties', 'responsibility', 'responsibilities',
                'evaluation', 'appraisal', 'assessment', 'analysis', 'study', 'research',
                'survey', 'questionnaire', 'form', 'application', 'resume', 'cv', 'portfolio',
                'delivery', 'shipment', 'package', 'order', 'purchase', 'buy', 'sale', 'sell',
                'contract', 'agreement', 'deal', 'transaction', 'payment', 'invoice', 'bill',
                'salary', 'wage', 'pay', 'income', 'revenue', 'profit', 'loss', 'expense',
                'cost', 'price', 'fee', 'charge', 'tax', 'fine', 'penalty', 'interest',
                'loan', 'mortgage', 'credit', 'debit', 'account', 'balance', 'statement',
                'reporting', 'filing', 'submission', 'filing', 'audit', 'inspection',
                'compliance', 'regulation', 'policy', 'procedure', 'process', 'method',
                'technique', 'approach', 'strategy', 'tactic', 'plan', 'planning', 'forecast',
                'prediction', 'estimate', 'calculation', 'computation', 'analysis', 'examination',
                'investigation', 'research', 'study', 'exploration', 'discovery', 'finding',
                'result', 'outcome', 'conclusion', 'decision', 'choice', 'option', 'alternative',
                'solution', 'answer', 'response', 'reply', 'reaction', 'feedback', 'comment',
                'suggestion', 'recommendation', 'advice', 'guidance', 'instruction', 'direction',
                'command', 'order', 'request', 'demand', 'requirement', 'need', 'necessity',
                'obligation', 'duty', 'responsibility', 'liability', 'accountability', 'authority',
                'power', 'control', 'influence', 'impact', 'effect', 'consequence', 'outcome',
                'issue', 'problem', 'challenge', 'difficulty', 'obstacle', 'barrier', 'hindrance',
                'delay', 'postponement', 'cancellation', 'termination', 'conclusion', 'ending',
                'finish', 'completion', 'achievement', 'accomplishment', 'success', 'victory',
                'win', 'defeat', 'loss', 'failure', 'mistake', 'error', 'fault', 'blame',
                'responsibility', 'accountability', 'liability', 'obligation', 'commitment',
                'promise', 'pledge', 'vow', 'oath', 'swear', 'guarantee', 'warranty', 'assurance',
                'insurance', 'protection', 'security', 'safety', 'health', 'wellness', 'fitness',
                'exercise', 'workout', 'training', 'education', 'learning', 'teaching', 'instruction',
                'school', 'college', 'university', 'institute', 'academy', 'faculty', 'department',
                'division', 'section', 'unit', 'branch', 'office', 'department', 'team', 'group',
                'committee', 'board', 'council', 'commission', 'assembly', 'congress', 'parliament',
                'senate', 'house', 'court', 'tribunal', 'jury', 'panel', 'forum', 'conference',
                'seminar', 'workshop', 'symposium', 'summit', 'meeting', 'gathering', 'assembly',
                'celebration', 'party', 'event', 'occasion', 'ceremony', 'ritual', 'tradition',
                'custom', 'practice', 'habit', 'routine', 'schedule', 'timetable', 'agenda',
                'program', 'programme', 'curriculum', 'syllabus', 'course', 'class', 'lesson',
                'lecture', 'talk', 'speech', 'address', 'presentation', 'performance', 'show',
                'display', 'exhibition', 'exhibit', 'demonstration', 'demo', 'sample', 'example',
                'illustration', 'instance', 'case', 'situation', 'circumstance', 'condition',
                'state', 'status', 'position', 'rank', 'level', 'grade', 'class', 'category',
                'type', 'kind', 'sort', 'variety', 'form', 'version', 'edition', 'release',
                'update', 'upgrade', 'improvement', 'enhancement', 'modification', 'change',
                'revision', 'correction', 'adjustment', 'adaptation', 'modification', 'alteration',
                'transformation', 'conversion', 'transition', 'shift', 'move', 'transfer', 'exchange',
                'substitution', 'replacement', 'substitute', 'alternative', 'option', 'choice',
                'selection', 'pick', 'preference', 'favor', 'support', 'endorsement', 'approval',
                'acceptance', 'agreement', 'consent', 'permission', 'authorization', 'license',
                'permit', 'certificate', 'diploma', 'degree', 'qualification', 'credential',
                'certification', 'accreditation', 'validation', 'verification', 'confirmation',
                'authentication', 'endorsement', 'ratification', 'sanction', 'approval', 'consent',
                'development', 'quality', 'market', 'customer'
            ]
            if (len(first_word) > 1 and first_word[0].isupper() and
                first_word.lower() not in excluded_words and
                (sender_name is None or first_word != sender_name)):
                # Check if this is a possessive form and extract just the name
                if first_word.endswith("'s"):
                    return first_word[:-2]  # Remove the "'s" part
                return first_word
        
        # Check for "you" or "your" indicating the message is for the user (check after names)
        if 'you' in combined_text or 'your' in combined_text:
            return 'you'
            
        # Check conversation context for names mentioned
        if conversation_context:
            # Look for names in recent conversation that aren't the sender
            for context_msg in reversed(conversation_context[-3:]):  # Last 3 messages
                name_match = re.search(r'\b([A-Z][a-z]+)\b', context_msg)
                if name_match:
                    name = name_match.group(1)
                    if (name not in [sender_name, 'You'] and 
                        name.lower() not in ['the', 'this', 'that', 'please']):
                        # Check if this name appears in current message
                        if name.lower() in combined_text:
                            return name
        
        # Default to unclear if no clear recipient can be determined
        return 'unclear'

    def extract_deadlines(self, text: str) -> List[Dict]:
        """Extract all deadlines from text with confidence scores, merging overlapping matches."""
        deadlines = []
        
        # Extract dates with regex
        regex_dates = self.extract_dates_regex(text)
        
        # Remove overlapping matches (keep the most specific/longest match)
        filtered_dates = []
        for i, date_info in enumerate(regex_dates):
            is_overlapping = False
            for j, other_date in enumerate(regex_dates):
                if i != j:
                    # Check if current match is contained within another match
                    if (date_info['start'] >= other_date['start'] and 
                        date_info['end'] <= other_date['end'] and
                        len(date_info['text']) < len(other_date['text'])):
                        is_overlapping = True
                        break
            
            if not is_overlapping:
                filtered_dates.append(date_info)
        
        # Process each date to determine if it's a deadline
        for date_info in filtered_dates:
            date_text = date_info['text']
            
            # Try to parse the date
            parsed_date = self.parse_absolute_date(date_info)
            if not parsed_date:
                parsed_date = self.parse_relative_date(date_text)
            
            if parsed_date:
                # Check if this date is in a deadline context
                context, confidence = self.find_deadline_context(text, date_info['start'], len(date_text))
                
                # Boost confidence for certain pattern types
                if date_info['pattern_type'] in ['by_context_time', 'day_time_combined', 'day_time_ampm', 
                                                   'relative_time_combined', 'relative_time_ampm']:
                    confidence = max(confidence, 0.85)
                
                # Only include deadlines with sufficient confidence
                effective_confidence = confidence if context else 0.45
                if effective_confidence > 0.4:
                    deadline = {
                        'date_text': date_text,
                        'parsed_date': parsed_date.strftime('%Y-%m-%d %H:%M:%S') if parsed_date.hour or parsed_date.minute else parsed_date.strftime('%Y-%m-%d'),
                        'context': context,
                        'confidence': effective_confidence,
                        'position': date_info['start']
                    }
                    
                    deadlines.append(deadline)
        
        # Sort by position in text and remove duplicates with same parsed_date
        deadlines.sort(key=lambda x: x['position'])
        
        # Remove duplicate parsed dates (keep first occurrence)
        seen_dates = set()
        unique_deadlines = []
        for deadline in deadlines:
            date_key = deadline['parsed_date']
            if date_key not in seen_dates:
                seen_dates.add(date_key)
                unique_deadlines.append(deadline)
        
        return unique_deadlines
    
    def extract_deadlines_from_message(self, message):
        """Extract deadlines from a message in JSON format or string."""
        if isinstance(message, str):
            try:
                message_data = json.loads(message)
            except json.JSONDecodeError:
                # If it's not valid JSON, treat as plain text
                return self.extract_deadlines(message)
        else:
            message_data = message
        
        # Handle JSON message format
        if isinstance(message_data, dict) and 'content' in message_data:
            content = message_data['content']
            sender = message_data.get('sender_name', 'Unknown')
            timestamp = message_data.get('time_stamp', 'Unknown')
            
            # Extract deadlines from content
            deadlines = self.extract_deadlines(content)
            
            # Add message metadata to each deadline
            for deadline in deadlines:
                deadline['sender_name'] = sender
                deadline['time_stamp'] = timestamp
                deadline['message_content'] = content
                                
                # Try to identify the recipient of this deadline
                recipient = self.find_deadline_recipient(content, sender)
                if recipient:
                    deadline['recipient'] = recipient
            
            return deadlines
        else:
            # Handle as plain text
            return self.extract_deadlines(str(message_data))
    
    def extract_deadlines_from_conversation(self, conversation):
        """Extract deadlines from a conversation (list of messages)."""
        all_deadlines = []
        
        for i, message in enumerate(conversation):
            deadlines = self.extract_deadlines_from_message(message)
            # Add conversation index to each deadline
            for deadline in deadlines:
                deadline['message_index'] = i
            all_deadlines.extend(deadlines)
        
        return all_deadlines
    
    def learn_from_feedback(self, message, correct_recipient):
        """Learn from user feedback to improve recipient detection."""
        # Store the pattern for future reference
        content = message.get('content', '') if isinstance(message, dict) else str(message)
        sender = message.get('sender_name', 'Unknown') if isinstance(message, dict) else 'Unknown'
        
        # Add to learning database
        pattern_key = f"{sender}:{content}"
        self.recipient_patterns[pattern_key] = correct_recipient
        
        # Add to conversation history
        self.conversation_history.append({
            'message': message,
            'correct_recipient': correct_recipient
        })
        
        print(f"Learned: '{content}' -> Recipient: {correct_recipient}")

# Test function
def test_model():
    """Test the model with various inputs."""
    extractor = EnhancedDeadlineExtractor()
    
    test_cases= [
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
    },
    {
        "sender_name": "Zain",
        "content": "Main naye graphs add kar leta hoon aur formatting bhi check kar lunga.",
        "time_stamp": "2025-10-14 09:06"
    },
    {
        "sender_name": "Sara",
        "content": "Last time font style mix tha, is dafa same font use kar lena please.",
        "time_stamp": "2025-10-14 09:07"
    },
    {
        "sender_name": "Ali",
        "content": "Ek slide hamare naye product launch ke bare mein bhi add kar do, client interested hai.",
        "time_stamp": "2025-10-14 09:09"
    },
    {
        "sender_name": "Hamza",
        "content": "Kya product ki images par Urdu captions bhi daal doon?",
        "time_stamp": "2025-10-14 09:11"
    },
    {
        "sender_name": "Zain",
        "content": "Haan, bilingual captions achi lagen gi. Slides zyada professional aur local feel dengi.",
        "time_stamp": "2025-10-14 09:12"
    },
    {
        "sender_name": "Sara",
        "content": "Marketing team ne bola tha ke color theme unke naye campaign ke sath match kare — blue aur turquoise shades use karo.",
        "time_stamp": "2025-10-14 09:14"
    },
    {
        "sender_name": "Ali",
        "content": "Pichli baar file sharing mein problem tha, ensure kar lena ke sabko updated version visible ho.",
        "time_stamp": "2025-10-14 09:15"
    },
    {
        "sender_name": "Hamza",
        "content": "Haan, Google Drive thoda slow tha. Main dobara upload karke naya link share karta hoon.",
        "time_stamp": "2025-10-14 09:16"
    },
    {
        "sender_name": "Zain",
        "content": "Please link editable banana, warna main graphs replace nahi kar paunga.",
        "time_stamp": "2025-10-14 09:17"
    },
    {
        "sender_name": "Sara",
        "content": "Waise client ne kaha hai ke ek choti demo video bhi include karein. Last slide pe add kar dein?",
        "time_stamp": "2025-10-14 09:19"
    },
    {
        "sender_name": "Ali",
        "content": "Yes, mere paas 30 second ka clip ready hai. Slides finalize hone ke baad daal dunga.",
        "time_stamp": "2025-10-14 09:20"
    },
    {
        "sender_name": "Hamza",
        "content": "Cool. Chalo sab kaam shaam tak finish karte hain taake kal subah review kar saken.",
        "time_stamp": "2025-10-14 09:21"
    }
]
    
    print("Testing Deadline Extractor Model")
    print("=" * 35)
    
    for i, test_case in enumerate(test_cases, 1):
        print(f"\n{i}. {test_case['sender_name']}: {test_case['content']}")
        
        # Extract deadlines
        deadlines = extractor.extract_deadlines_from_message(test_case)
        
        # Identify recipient
        recipient = extractor.find_deadline_recipient(test_case['content'], test_case['sender_name'])
        
        print(f"   Recipient: {recipient or 'unclear'}")
        print(f"   Deadlines Found: {len(deadlines)}")
        
        for j, deadline in enumerate(deadlines, 1):
            print(f"     {j}. {deadline['date_text']} -> {deadline['parsed_date']}")
            print(f"        Context: {deadline['context'] or 'None'} (confidence: {deadline['confidence']:.2f})")

if __name__ == "__main__":
    test_model()