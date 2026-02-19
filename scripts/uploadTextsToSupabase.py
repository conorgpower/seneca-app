"""
Script to fetch philosophical texts from Project Gutenberg and upload to Supabase with local embeddings
Each book has custom parsing rules based on its unique structure
Run with: python3 scripts/uploadTextsToSupabase.py
"""

import os
import requests
import time
from dotenv import load_dotenv
from supabase import create_client, Client
from sentence_transformers import SentenceTransformer
from bs4 import BeautifulSoup
import re
import uuid

# Load environment variables
load_dotenv()

supabase_url = os.getenv('SUPABASE_URL')
supabase_key = os.getenv('SUPABASE_ANON_KEY')

if not supabase_url or not supabase_key:
    print('❌ Missing required environment variables')
    print('Please set SUPABASE_URL and SUPABASE_ANON_KEY in .env file')
    exit(1)

supabase: Client = create_client(supabase_url, supabase_key)

# Load local embedding model
print('📥 Loading embedding model (this may take a moment on first run)...')
model = SentenceTransformer('all-MiniLM-L6-v2')  # 384-dimensional embeddings
print('✅ Model loaded!\n')

# Curated list of public domain philosophical texts
PHILOSOPHICAL_TEXTS = [
    # {
    #     'id': 'marcus-meditations',
    #     'author': 'Marcus Aurelius',
    #     'title': 'Meditations',
    #     'gutenberg_id': 2680,
    #     'translator': 'George Long'
    # },
    # {
    #     'id': 'seneca-morals',
    #     'author': 'Seneca',
    #     'title': "Seneca's Morals",
    #     'gutenberg_id': 56075,
    #     'translator': "Roger L'Estrange"
    # },
    # {
    #     'id': 'seneca-dialogues',
    #     'author': 'Seneca',
    #     'title': 'Minor Dialogues',
    #     'gutenberg_id': 64576,
    #     'translator': 'Aubrey Stewart'
    # },
    # {
    #     'id': 'epictetus-enchiridion',
    #     'author': 'Epictetus',
    #     'title': 'The Enchiridion',
    #     'gutenberg_id': 45109,
    #     'translator': 'Thomas Wentworth Higginson'
    # },
    {
        'id': 'nietzsche-zarathustra',
        'author': 'Friedrich Nietzsche',
        'title': 'Thus Spake Zarathustra',
        'gutenberg_id': 1998,
        'translator': 'Thomas Common'
    }
]

def fetch_gutenberg_text(gutenberg_id):
    """Fetch text from Project Gutenberg HTML version for better formatting"""
    url = f'https://www.gutenberg.org/cache/epub/{gutenberg_id}/pg{gutenberg_id}-images.html'
    
    try:
        print(f'  Fetching from: {url}')
        response = requests.get(url, timeout=30)
        response.raise_for_status()
        
        # Parse HTML to extract clean text
        soup = BeautifulSoup(response.content, 'html.parser')
        
        # Remove script and style elements
        for script in soup(["script", "style"]):
            script.decompose()
        
        # Remove page numbers (span elements with class "pagenum")
        for pagenum in soup.find_all("span", class_="pagenum"):
            pagenum.decompose()
        
        # Remove superscript footnote references (sup elements)
        for sup in soup.find_all("sup"):
            sup.decompose()
        
        # Add double newlines after section headings to create proper paragraph breaks
        for h in soup.find_all(['h1', 'h2', 'h3', 'h4', 'h5', 'h6']):
            h.append('\n\n')
        
        # Add single newline after paragraphs
        for p in soup.find_all('p'):
            p.append('\n')
        
        text = soup.get_text(separator=' ')
        
        # Collapse multiple spaces into single spaces
        text = re.sub(r' +', ' ', text)
        
        # Remove spaces before punctuation marks
        text = re.sub(r'\s+([.,;:!?])', r'\1', text)
        
        # Clean up excessive whitespace but preserve intentional line breaks
        lines = text.split('\n')
        cleaned_lines = []
        for line in lines:
            cleaned_line = line.strip()
            # Collapse any remaining multiple spaces within lines
            cleaned_line = re.sub(r' +', ' ', cleaned_line)
            # Remove spaces before punctuation
            cleaned_line = re.sub(r'\s+([.,;:!?])', r'\1', cleaned_line)
            cleaned_lines.append(cleaned_line)
        
        # Join back with single newlines, preserving blank lines
        return '\n'.join(cleaned_lines)
        
    except Exception as e:
        print(f'  HTML fetch failed, trying text version: {e}')
        # Fallback to text version
        try:
            text_url = f'https://www.gutenberg.org/files/{gutenberg_id}/{gutenberg_id}-0.txt'
            response = requests.get(text_url, timeout=30)
            response.raise_for_status()
            return response.text
        except:
            # Try alternative text URL format
            alt_url = f'https://www.gutenberg.org/cache/epub/{gutenberg_id}/pg{gutenberg_id}.txt'
            print(f'  Trying alternative URL: {alt_url}')
            response = requests.get(alt_url, timeout=30)
            response.raise_for_status()
            return response.text

def extract_content(text):
    """Extract main content between START and END markers"""
    start_marker = "*** START OF"
    end_marker = "*** END OF"
    
    start_idx = text.find(start_marker)
    end_idx = text.find(end_marker)
    
    if start_idx != -1 and end_idx != -1:
        start_idx = text.find('\n', start_idx)
        if start_idx != -1:
            text = text[start_idx:end_idx]
    
    return text.strip()

def chunk_marcus_meditations(text, author, work):
    """Marcus Aurelius Meditations - organized by BOOKS and Roman numeral sections"""
    chunks = []
    current_book = None
    processing_started = False
    
    # Find the start marker: "THE FIRST BOOK" followed by "I. Of my grandfather"
    start_marker = "THE FIRST BOOK"
    actual_start_marker = "I. Of my grandfather"
    end_marker = "As for thyself; thou hast to do with neither. Go thy ways then well pleased and contented: for so is He that dismisseth thee."
    
    # Find start and end positions
    start_pos = text.find(start_marker)
    if start_pos == -1:
        print("    Could not find start marker 'THE FIRST BOOK'")
        return create_chunk_objects(chunks, author, work)
    
    actual_start_pos = text.find(actual_start_marker, start_pos)
    if actual_start_pos == -1:
        print("    Could not find actual start marker 'I. Of my grandfather'")
        return create_chunk_objects(chunks, author, work)
    
    end_pos = text.find(end_marker)
    if end_pos == -1:
        print("    Could not find end marker - processing entire text")
        filtered_text = text[start_pos:]
    else:
        filtered_text = text[start_pos:end_pos]
        print(f"    Found end marker at position {end_pos}")
    
    print(f"    Processing text from position {start_pos} to {end_pos if end_pos != -1 else 'end'}")
    
    # Split filtered content into paragraphs
    paragraphs = filtered_text.split('\n\n')
    
    for para in paragraphs:
        para = para.strip()
        if not para:
            continue
        
        first_line = para.split('\n')[0].strip()
        first_line_upper = first_line.upper()
        
        # Detect book headers: "THE FIRST BOOK", "THE SECOND BOOK", etc.
        if 'BOOK' in first_line_upper and any(num in first_line_upper for num in ['FIRST', 'SECOND', 'THIRD', 'FOURTH', 'FIFTH', 'SIXTH', 'SEVENTH', 'EIGHTH', 'NINTH', 'TENTH', 'ELEVENTH', 'TWELFTH']):
            current_book = first_line
            print(f"    Found: {current_book}")
            continue
        
        # Skip if we haven't found a book yet
        if not current_book:
            continue
        
        # Look for Roman numeral sections within the paragraph
        lines = para.split('\n')
        
        # Check if first line starts with a Roman numeral followed by a period
        if len(lines) > 0:
            first_word = lines[0].strip().split('.')[0]
            roman_numerals = ['I', 'II', 'III', 'IV', 'V', 'VI', 'VII', 'VIII', 'IX', 'X', 
                             'XI', 'XII', 'XIII', 'XIV', 'XV', 'XVI', 'XVII', 'XVIII', 'XIX', 'XX',
                             'XXI', 'XXII', 'XXIII', 'XXIV', 'XXV', 'XXVI', 'XXVII', 'XXVIII', 'XXIX', 'XXX',
                             'XXXI', 'XXXII', 'XXXIII', 'XXXIV', 'XXXV', 'XXXVI', 'XXXVII', 'XXXVIII', 'XXXIX', 'XL',
                             'XLI', 'XLII', 'XLIII', 'XLIV', 'XLV', 'XLVI', 'XLVII', 'XLVIII', 'XLIX', 'L', 'LI', 'LII', 'LIII',
                             'LIV', 'LV', 'LVI', 'LVII', 'LVIII']
            
            if first_word in roman_numerals:
                section_title = f"{current_book} - Section {first_word}"
                print(f"      Found section: {first_word}")
                chunks.append((section_title, para))
    
    return create_chunk_objects(chunks, author, work)

def chunk_seneca_morals(text, author, work):
    """Seneca's Morals - organized by main sections (BENEFITS, HAPPY LIFE, ANGER, CLEMENCY) and chapters within each"""
    chunks = []
    
    # Find where the actual content starts (skip boilerplate)
    start_marker = "SENECA OF BENEFITS"
    start_pos = text.find(start_marker)
    
    if start_pos == -1:
        print("    Could not find start marker 'SENECA OF BENEFITS'")
        return create_chunk_objects(chunks, author, work)
    
    # Process from start marker onwards
    filtered_text = text[start_pos:]
    print(f"    Processing text from position {start_pos}")
    
    # Split into lines for processing
    lines = filtered_text.split('\n')
    
    current_main_section = None
    current_chapter = None
    current_chapter_title = None
    chapter_content = []
    
    i = 0
    while i < len(lines):
        line = lines[i].strip()
        
        # Detect main section headers: "SENECA OF BENEFITS", "SENECA OF A HAPPY LIFE", etc.
        if line.startswith('SENECA OF '):
            # Save previous chapter if exists
            if current_chapter and chapter_content:
                full_text = '\n'.join(chapter_content).strip()
                if len(full_text) > 100:
                    section_name = f"{current_main_section} - {current_chapter}"
                    if current_chapter_title:
                        section_name += f" - {current_chapter_title}"
                    chunks.append((section_name, full_text))
                    print(f"      Created chunk: {section_name}")
            
            current_main_section = line
            current_chapter = None
            current_chapter_title = None
            chapter_content = []
            print(f"    Found main section: {current_main_section}")
            i += 1
            continue
        
        # Detect chapter headers: "CHAPTER I.", "CHAPTER II.", etc.
        if line.startswith('CHAPTER ') and '.' in line and len(line) < 20:
            # Save previous chapter if exists
            if current_chapter and chapter_content:
                full_text = '\n'.join(chapter_content).strip()
                if len(full_text) > 100:
                    section_name = f"{current_main_section} - {current_chapter}"
                    if current_chapter_title:
                        section_name += f" - {current_chapter_title}"
                    chunks.append((section_name, full_text))
                    print(f"      Created chunk: {section_name}")
            
            current_chapter = line.replace('.', '').strip()
            chapter_content = []
            
            # Look ahead for chapter title (may span multiple lines, all in ALL CAPS)
            # But stop if we hit another chapter marker (table of contents)
            title_lines = []
            j = i + 1
            while j < len(lines):
                next_line = lines[j].strip()
                # Skip blank lines
                if not next_line:
                    j += 1
                    continue
                # Stop if we hit another CHAPTER marker (we're in a table of contents)
                if next_line.startswith('CHAPTER '):
                    break
                # Stop if we hit other section markers
                if next_line.startswith('SENECA OF ') or next_line in ['TO THE READER.', 'CONTENTS']:
                    break
                # If line is ALL CAPS, it's part of the title
                if next_line.isupper():
                    title_lines.append(next_line)
                    j += 1
                else:
                    # We've hit content that's not part of the title
                    break
            
            # Only proceed if we found a title (not just more chapter markers)
            if title_lines:
                current_chapter_title = ' '.join(title_lines)
                i = j - 1  # Set position to just before the content starts
            else:
                # No title found, this might be table of contents, skip it
                current_chapter = None
            
            i += 1
            continue
        
        # Skip empty lines and very short lines
        if not line or len(line) < 10:
            if chapter_content:  # Keep blank lines within content
                chapter_content.append(line)
            i += 1
            continue
        
        # Skip boilerplate
        if any(skip in line.lower() for skip in ['project gutenberg', 'table of contents', 'http://']):
            i += 1
            continue
        
        # Add content to current chapter
        if current_main_section:
            chapter_content.append(line)
        
        i += 1
    
    # Don't forget the last chapter
    if current_chapter and chapter_content:
        full_text = '\n'.join(chapter_content).strip()
        if len(full_text) > 100:
            section_name = f"{current_main_section} - {current_chapter}"
            if current_chapter_title:
                section_name += f" - {current_chapter_title}"
            chunks.append((section_name, full_text))
            print(f"      Created chunk: {section_name}")
    # Handle SENECA OF CLEMENCY which has no chapter number
    elif current_main_section and chapter_content and 'CLEMENCY' in current_main_section:
        full_text = '\n'.join(chapter_content).strip()
        if len(full_text) > 100:
            chunks.append((current_main_section, full_text))
            print(f"      Created chunk: {current_main_section}")
    
    return create_chunk_objects(chunks, author, work)

def chunk_seneca_dialogues(text, author, work):
    """Seneca's Minor Dialogues - organized by 14 books with Roman numeral paragraphs"""
    chunks = []
    
    # Find the start of the content
    start_marker = "THE FIRST BOOK OF THE DIALOGUES"
    start_pos = text.find(start_marker)
    
    if start_pos == -1:
        print("    Could not find start marker 'THE FIRST BOOK OF THE DIALOGUES'")
        return create_chunk_objects(chunks, author, work)
    
    # Find the end of the content (specific ending paragraph)
    end_marker = "how what is crooked may be straightened. . . ."
    end_pos = text.find(end_marker)
    
    if end_pos == -1:
        print("    Could not find end marker - processing entire text")
        filtered_text = text[start_pos:]
    else:
        # Include the ending marker text
        end_pos = end_pos + len(end_marker)
        filtered_text = text[start_pos:end_pos]
        print(f"    Found end marker at position {end_pos}")
    
    print(f"    Processing text from position {start_pos} to {end_pos if end_pos != -1 else 'end'}")
    
    # Remove footnote anchor tags with superscripts like <a href="#fn-5.9" ...><sup>[9]</sup></a>
    filtered_text = re.sub(r'<a[^>]*><sup>\[\d+\]</sup></a>', '', filtered_text)
    # Remove any remaining standalone superscript footnote markers like <sup>[1]</sup>
    filtered_text = re.sub(r'<sup>\[\d+\]</sup>', '', filtered_text)
    
    # Split into lines for processing
    lines = filtered_text.split('\n')
    
    current_book = None
    current_book_title = None
    current_paragraph = []
    current_paragraph_num = None
    in_footnotes = False
    
    # Roman numerals list for paragraph detection
    roman_numerals = ['I', 'II', 'III', 'IV', 'V', 'VI', 'VII', 'VIII', 'IX', 'X', 
                      'XI', 'XII', 'XIII', 'XIV', 'XV', 'XVI', 'XVII', 'XVIII', 'XIX', 'XX',
                      'XXI', 'XXII', 'XXIII', 'XXIV', 'XXV', 'XXVI', 'XXVII', 'XXVIII', 'XXIX', 'XXX',
                      'XXXI', 'XXXII', 'XXXIII', 'XXXIV', 'XXXV', 'XXXVI', 'XXXVII', 'XXXVIII', 'XXXIX', 'XL',
                      'XLI', 'XLII', 'XLIII', 'XLIV', 'XLV', 'XLVI', 'XLVII', 'XLVIII', 'XLIX', 'L',
                      'LI', 'LII', 'LIII', 'LIV', 'LV', 'LVI', 'LVII', 'LVIII', 'LIX', 'LX']
    
    i = 0
    while i < len(lines):
        line = lines[i].strip()
        
        # Detect book headers (chapters 1-12) - note "DIALOGUES" (plural)
        book_match = re.match(r'THE (FIRST|SECOND|THIRD|FOURTH|FIFTH|SIXTH|SEVENTH|EIGHTH|NINTH|TENTH|ELEVENTH|TWELFTH) BOOK OF THE DIALOGUES', line)
        if book_match:
            # Save previous paragraph if exists
            if current_book and current_paragraph and current_paragraph_num:
                para_text = '\n'.join(current_paragraph).strip()
                # Remove any remaining footnote markers like [1], [2], etc.
                para_text = re.sub(r'\[\d+\]', '', para_text)
                if len(para_text) > 100:
                    section_name = f"{current_book_title} - Paragraph {current_paragraph_num}"
                    chunks.append((section_name, para_text))
                    print(f"      Created paragraph chunk: {current_paragraph_num}")
            
            current_book = line
            current_book_title = line
            current_paragraph = []
            current_paragraph_num = None
            in_footnotes = False
            print(f"    Found: {current_book}")
            i += 1
            continue
        
        # Detect special book headers (chapters 13-14) - note "DIALOGUE" (singular)
        # These chapters have multi-line titles, so we need to collect them
        if 'BOOK OF THE DIALOGUE OF L. ANNAEUS' in line:
            # Save previous paragraph if exists
            if current_book and current_paragraph and current_paragraph_num:
                para_text = '\n'.join(current_paragraph).strip()
                # Remove any remaining footnote markers like [1], [2], etc.
                para_text = re.sub(r'\[\d+\]', '', para_text)
                if len(para_text) > 100:
                    section_name = f"{current_book_title} - Paragraph {current_paragraph_num}"
                    chunks.append((section_name, para_text))
                    print(f"      Created paragraph chunk: {current_paragraph_num}")
            
            current_book = line
            current_book_title = line
            current_paragraph = []
            current_paragraph_num = None
            in_footnotes = False
            print(f"    Found: {current_book}")
            i += 1
            continue
        
        # Skip if we haven't found a book yet
        if not current_book:
            i += 1
            continue
        
        # Detect start of footnotes section (lines that start with [number])
        # Footnotes appear at the END of each chapter, so stay in footnote mode until next chapter
        if re.match(r'^\[\d+\]', line):
            # Save the current paragraph before entering footnote mode
            if current_paragraph and current_paragraph_num:
                para_text = '\n'.join(current_paragraph).strip()
                # Remove any remaining footnote markers like [1], [2], etc.
                para_text = re.sub(r'\[\d+\]', '', para_text)
                if len(para_text) > 100:
                    section_name = f"{current_book_title} - Paragraph {current_paragraph_num}"
                    chunks.append((section_name, para_text))
                    print(f"      Created paragraph chunk: {current_paragraph_num}")
                current_paragraph = []
                current_paragraph_num = None
            
            in_footnotes = True
            i += 1
            continue
        
        # Skip all footnote lines - they continue until the next chapter
        if in_footnotes:
            i += 1
            continue
        
        # Detect Roman numeral paragraph markers (only when not in footnotes)
        # Look for lines that start with "Roman numeral. " pattern (e.g., "I. ", "II. ", "III. ")
        line_start = line.split('.')[0].strip() if '.' in line else ''
        if line_start in roman_numerals and len(line) > len(line_start) + 2:
            # Save previous paragraph if exists
            if current_paragraph and current_paragraph_num:
                para_text = '\n'.join(current_paragraph).strip()
                # Remove any remaining footnote markers like [1], [2], etc.
                para_text = re.sub(r'\[\d+\]', '', para_text)
                if len(para_text) > 100:
                    section_name = f"{current_book_title} - Paragraph {current_paragraph_num}"
                    chunks.append((section_name, para_text))
                    print(f"      Created paragraph chunk: {current_paragraph_num}")
            
            # Start new paragraph - store the numeral separately and only add the full line to content
            current_paragraph_num = line_start
            current_paragraph = [line]
            i += 1
            continue
        
        # Skip boilerplate and very short lines
        if not line or len(line) < 10:
            if current_paragraph:  # Keep blank lines within content
                current_paragraph.append(line)
            i += 1
            continue
        
        if any(skip in line.lower() for skip in ['project gutenberg', 'table of contents', 'http://']):
            i += 1
            continue
        
        # Add content to current paragraph
        if current_paragraph:
            current_paragraph.append(line)
        
        i += 1
    
    # Don't forget the last paragraph
    if current_book and current_paragraph and current_paragraph_num and not in_footnotes:
        para_text = '\n'.join(current_paragraph).strip()
        # Remove any remaining footnote markers like [1], [2], etc.
        para_text = re.sub(r'\[\d+\]', '', para_text)
        if len(para_text) > 100:
            section_name = f"{current_book_title} - Paragraph {current_paragraph_num}"
            chunks.append((section_name, para_text))
            print(f"      Created paragraph chunk: {current_paragraph_num}")
    
    return create_chunk_objects(chunks, author, work)

def chunk_epictetus(text, author, work):
    """Epictetus Enchiridion - numbered sections (I, II, III, etc.)"""
    chunks = []
    current_section = "Introduction"
    
    # Define the start marker - use the unique first line of section I
    # Using a shorter unique phrase to avoid whitespace matching issues
    start_marker = "There are things which are within our power"
    
    # Define the end marker - last line we want to include (try multiple quote styles)
    end_markers = [
        '"Anytus and Melitus may kill me indeed; but hurt me they cannot."',
        '"Anytus and Melitus may kill me indeed; but hurt me they cannot."',
        'Anytus and Melitus may kill me indeed; but hurt me they cannot.'
    ]
    
    # Find and trim to the start marker
    start_pos = text.find(start_marker)
    if start_pos != -1:
        print(f"    Trimming text before position {start_pos}")
        print(f"    Start text preview: {text[start_pos:start_pos+200]!r}")
        text = text[start_pos:]
    else:
        print("    Warning: Could not find start marker (first line of section I)")
        print(f"    First 500 chars of text: {text[:500]!r}")
    
    # Find and trim after the end marker (try all variations)
    end_pos = -1
    for end_marker in end_markers:
        end_pos = text.find(end_marker)
        if end_pos != -1:
            # Include the end marker line itself
            end_pos = end_pos + len(end_marker)
            print(f"    Trimming text after position {end_pos}")
            print(f"    End text preview (before marker): {text[max(0, end_pos-200):end_pos]!r}")
            text = text[:end_pos]
            break
    
    if end_pos == -1:
        print("    Warning: Could not find end marker with Crito/Anytus quote")
        print(f"    Last 500 chars of text: {text[-500:]!r}")
    
    # Split by double newline first
    paragraphs = text.split('\n\n')
    
    print(f"    Total paragraphs after split: {len(paragraphs)}")
    
    # Roman numerals list
    roman_numerals = ['I', 'II', 'III', 'IV', 'V', 'VI', 'VII', 'VIII', 'IX', 'X', 
                      'XI', 'XII', 'XIII', 'XIV', 'XV', 'XVI', 'XVII', 'XVIII', 'XIX', 'XX',
                      'XXI', 'XXII', 'XXIII', 'XXIV', 'XXV', 'XXVI', 'XXVII', 'XXVIII', 'XXIX', 'XXX',
                      'XXXI', 'XXXII', 'XXXIII', 'XXXIV', 'XXXV', 'XXXVI', 'XXXVII', 'XXXVIII', 'XXXIX', 'XL',
                      'XLI', 'XLII', 'XLIII', 'XLIV', 'XLV', 'XLVI', 'XLVII', 'XLVIII', 'XLIX', 'L', 'LI', 'LII', 'LIII',
                      'LIV', 'LV', 'LVI', 'LVII', 'LVIII']
    
    # Start with Section I since our text begins at the first section
    current_section = "Section I"
    current_section_content = []
    print(f"    Found: {current_section}")
    
    for para in paragraphs:
        para = para.strip()
        if not para:
            continue
        
        # Skip boilerplate
        if any(skip in para.lower() for skip in ['project gutenberg', 'contents', 'http://', 'footnote']):
            continue
        
        # Check if this paragraph is just a Roman numeral (section header)
        if para in roman_numerals:
            # Save the previous section if it exists
            if current_section and current_section_content:
                full_text = '\n\n'.join(current_section_content)
                if len(full_text) > 50:
                    chunks.append((current_section, full_text))
            
            # Start new section
            current_section = f"Section {para}"
            current_section_content = []
            print(f"    Found: {current_section}")
        
        # Otherwise, add this paragraph to the current section's content
        elif current_section and len(para) > 50:
            current_section_content.append(para)
    
    # Don't forget the last section
    if current_section and current_section_content:
        full_text = '\n\n'.join(current_section_content)
        if len(full_text) > 50:
            chunks.append((current_section, full_text))
    
    return create_chunk_objects(chunks, author, work)

def chunk_nietzsche(text, author, work):
    """Nietzsche's Thus Spake Zarathustra - organized by chapters with Roman numerals"""
    chunks = []
    
    # Find the start marker - beginning of first chapter
    start_marker = "I. THE THREE METAMORPHOSES."
    start_pos = text.find(start_marker)
    
    if start_pos == -1:
        print("    Could not find start marker 'I. THE THREE METAMORPHOSES.'")
        return create_chunk_objects(chunks, author, work)
    
    # Find the end marker - use a unique phrase from the very end
    # Look for the ending that appears right before the commentary section
    end_marker = "coming out of gloomy mountains"
    end_pos = text.find(end_marker)
    
    if end_pos == -1:
        print("    Could not find end marker - processing entire text")
        filtered_text = text[start_pos:]
    else:
        # Include the ending text (find the period after "mountains")
        end_pos = text.find('.', end_pos)
        if end_pos != -1:
            end_pos = end_pos + 1  # Include the period
            filtered_text = text[start_pos:end_pos]
            print(f"    Found end marker at position {end_pos}")
        else:
            filtered_text = text[start_pos:]
            print("    Could not find period after end marker")
    
    print(f"    Processing text from position {start_pos} to {end_pos if end_pos != -1 else 'end'}")
    
    # Split into lines for processing
    lines = filtered_text.split('\n')
    
    current_chapter = None
    current_chapter_title = None
    chapter_content = []
    
    # Roman numerals list (extended for 80 chapters)
    roman_numerals = ['I', 'II', 'III', 'IV', 'V', 'VI', 'VII', 'VIII', 'IX', 'X',
                      'XI', 'XII', 'XIII', 'XIV', 'XV', 'XVI', 'XVII', 'XVIII', 'XIX', 'XX',
                      'XXI', 'XXII', 'XXIII', 'XXIV', 'XXV', 'XXVI', 'XXVII', 'XXVIII', 'XXIX', 'XXX',
                      'XXXI', 'XXXII', 'XXXIII', 'XXXIV', 'XXXV', 'XXXVI', 'XXXVII', 'XXXVIII', 'XXXIX', 'XL',
                      'XLI', 'XLII', 'XLIII', 'XLIV', 'XLV', 'XLVI', 'XLVII', 'XLVIII', 'XLIX', 'L',
                      'LI', 'LII', 'LIII', 'LIV', 'LV', 'LVI', 'LVII', 'LVIII', 'LIX', 'LX',
                      'LXI', 'LXII', 'LXIII', 'LXIV', 'LXV', 'LXVI', 'LXVII', 'LXVIII', 'LXIX', 'LXX',
                      'LXXI', 'LXXII', 'LXXIII', 'LXXIV', 'LXXV', 'LXXVI', 'LXXVII', 'LXXVIII', 'LXXIX', 'LXXX']
    
    i = 0
    while i < len(lines):
        line = lines[i].strip()
        
        # Detect chapter headers: Roman numeral followed by period and title
        # Pattern: "I. THE THREE METAMORPHOSES."
        if line:
            parts = line.split('.', 1)
            if len(parts) >= 2:
                potential_numeral = parts[0].strip()
                if potential_numeral in roman_numerals:
                    # Save previous chapter if exists
                    if current_chapter and chapter_content:
                        full_text = '\n'.join(chapter_content).strip()
                        if len(full_text) > 100:
                            section_name = f"Chapter {current_chapter} - {current_chapter_title}"
                            chunks.append((section_name, full_text))
                            print(f"      Created chunk: {section_name}")
                    
                    # Start new chapter
                    current_chapter = potential_numeral
                    current_chapter_title = parts[1].strip().rstrip('.')
                    chapter_content = []
                    print(f"    Found: Chapter {current_chapter} - {current_chapter_title}")
                    i += 1
                    continue
        
        # Skip empty lines and boilerplate
        if not line or len(line) < 10:
            if chapter_content:  # Keep blank lines within content
                chapter_content.append(line)
            i += 1
            continue
        
        if any(skip in line.lower() for skip in ['project gutenberg', 'table of contents', 'http://']):
            i += 1
            continue
        
        # Add content to current chapter
        if current_chapter:
            chapter_content.append(line)
        
        i += 1
    
    # Don't forget the last chapter
    if current_chapter and chapter_content:
        full_text = '\n'.join(chapter_content).strip()
        if len(full_text) > 100:
            section_name = f"Chapter {current_chapter} - {current_chapter_title}"
            chunks.append((section_name, full_text))
            print(f"      Created chunk: {section_name}")
    
    return create_chunk_objects(chunks, author, work)

def create_chunk_objects(chunks, author, work):
    """Convert (section, text) tuples to chunk objects"""
    print(f"  📝 Created {len(chunks)} chunks for {work}")
    return [
        {
            'id': str(uuid.uuid4()),
            'author': author,
            'work': work,
            'section': section,
            'text': text,
            'chunk_index': i
        }
        for i, (section, text) in enumerate(chunks)
    ]

def chunk_text(text, author, work):
    """Route to appropriate chunking function based on work"""
    # Extract main content first
    text = extract_content(text)
    
    # Route to specific chunker
    if 'Meditations' in work:
        return chunk_marcus_meditations(text, author, work)
    elif 'Morals' in work:
        return chunk_seneca_morals(text, author, work)
    elif 'Dialogues' in work or 'Epistles' in work:
        return chunk_seneca_dialogues(text, author, work)
    elif 'Enchiridion' in work:
        return chunk_epictetus(text, author, work)
    elif 'Republic' in work:
        return chunk_plato_republic(text, author, work)
    elif 'Zarathustra' in work:
        return chunk_nietzsche(text, author, work)
    else:
        # Generic fallback
        return chunk_seneca_morals(text, author, work)

def upload_to_supabase(chunks):
    """Generate embeddings and upload chunks to Supabase"""
    print(f'\n📤 Uploading {len(chunks)} chunks to Supabase...')
    
    # Process in batches
    batch_size = 20
    total_uploaded = 0
    
    for i in range(0, len(chunks), batch_size):
        batch = chunks[i:i + batch_size]
        
        # Generate embeddings for this batch
        texts = [chunk['text'] for chunk in batch]
        embeddings = model.encode(texts, show_progress_bar=False)
        
        # Prepare records for upload
        records = []
        for chunk, embedding in zip(batch, embeddings):
            records.append({
                'id': chunk['id'],
                'author': chunk['author'],
                'work': chunk['work'],
                'section': chunk['section'],
                'text': chunk['text'],
                'chunk_index': chunk['chunk_index'],
                'embedding': embedding.tolist()
            })
        
        # Upload to Supabase
        try:
            supabase.table('philosophical_texts').insert(records).execute()
            total_uploaded += len(records)
            print(f'  ✓ Uploaded batch {i//batch_size + 1} ({total_uploaded}/{len(chunks)} chunks)')
        except Exception as e:
            print(f'  ✗ Error uploading batch: {e}')
            continue
        
        # Small delay to avoid rate limiting
        time.sleep(0.5)
    
    print(f'✅ Upload complete! Total chunks: {total_uploaded}\n')

def main():
    print('🏛️  Philosophical Texts Uploader')
    print('=' * 50)
    
    for text_info in PHILOSOPHICAL_TEXTS:
        print(f"\n📖 Processing: {text_info['title']} by {text_info['author']}")
        
        try:
            # Fetch text
            raw_text = fetch_gutenberg_text(text_info['gutenberg_id'])
            print(f'  ✓ Downloaded {len(raw_text):,} characters')
            
            # Chunk text with custom rules for this book
            chunks = chunk_text(raw_text, text_info['author'], text_info['title'])
            
            if len(chunks) == 0:
                print(f'  ⚠️  No chunks created for {text_info["title"]}')
                continue
            
            # Upload chunks
            upload_to_supabase(chunks)
            
        except Exception as e:
            print(f'  ❌ Error processing {text_info["title"]}: {e}')
            continue
    
    print('\n' + '=' * 50)
    print('✨ All texts processed!')

if __name__ == '__main__':
    main()
