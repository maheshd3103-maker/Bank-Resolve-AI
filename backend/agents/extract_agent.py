import easyocr
import fitz
import os
import logging
import re
from typing import Dict, Any

logging.basicConfig(level=logging.CRITICAL)
logger = logging.getLogger(__name__)
logger.disabled = True

class DocumentExtractAgent:
    """Agent for extracting and validating document information"""
    
    def __init__(self):
        try:
            self.reader = easyocr.Reader(['en'])
        except Exception as e:
            self.reader = None
    
    def convert_pdf_to_image(self, pdf_path: str) -> str:
        """Convert PDF to image and return image path"""
        try:
            doc = fitz.open(pdf_path)
            page = doc[0]
            
            pix = page.get_pixmap()
            img_data = pix.tobytes("png")
            
            img_path = pdf_path.replace('.pdf', '_temp.png')
            with open(img_path, 'wb') as f:
                f.write(img_data)
            
            doc.close()
            return img_path
        except Exception as e:
            return None
    
    def extract_text_from_file(self, file_path: str) -> str:
        """Extract text from file (PDF or image)"""
        temp_image_path = None
        try:
            if self.reader is None:
                return ""
            
            print(f"Extracting text from: {os.path.basename(file_path)}")
            
            if file_path.lower().endswith('.pdf'):
                print("Converting PDF to image...")
                temp_image_path = self.convert_pdf_to_image(file_path)
                if temp_image_path is None:
                    return ""
                file_to_read = temp_image_path
            else:
                file_to_read = file_path
            
            result = self.reader.readtext(file_to_read)
            
            print("\n=== RAW EXTRACTED TEXT ===")
            extracted_text = []
            for detection in result:
                text = detection[1]
                if text.strip():
                    print(text)
                    extracted_text.append(text.strip())
            print("=" * 30)
            
            return '\n'.join(extracted_text)
            
        except Exception as e:
            print(f"Error extracting text: {e}")
            return ""
        finally:
            if temp_image_path and os.path.exists(temp_image_path):
                try:
                    os.remove(temp_image_path)
                except:
                    pass
    
    def extract_aadhaar_number(self, text: str) -> str:
        """Extract Aadhaar number from text"""
        try:
            patterns = [
                r'\b\d{4}\s*\d{4}\s*\d{4}\b',
                r'\b\d{12}\b'
            ]
            
            for pattern in patterns:
                match = re.search(pattern, text)
                if match:
                    return re.sub(r'\s+', '', match.group())
            
            return None
        except Exception as e:
            return None
    
    def extract_pan_number(self, text: str) -> str:
        """Extract PAN number from text"""
        try:
            patterns = [
                r'\b[A-Z]{5}\d{4}[A-Z]\b',
                r'\b[A-Z]{5}\s*\d{4}\s*[A-Z]\b'
            ]
            
            for pattern in patterns:
                match = re.search(pattern, text)
                if match:
                    return re.sub(r'\s+', '', match.group())
            
            return None
        except Exception as e:
            return None
    
    def extract_name_from_text(self, text: str, document_type: str) -> str:
        """Extract name from document text"""
        try:
            lines = [line.strip() for line in text.split('\n') if line.strip()]
            
            if document_type == 'aadhaar':
                skip_keywords = ['AADHAAR', 'GOVERNMENT', 'INDIA', 'DOB', 'MALE', 'FEMALE', 'ADDRESS', 'PIN', 'VID', 'UNIQUE', 'IDENTIFICATION', 'AUTHORITY']
                
                for line in lines:
                    if any(keyword in line.upper() for keyword in skip_keywords):
                        continue
                    if re.match(r'^[A-Z][a-z]+(\s+[A-Z][a-z]+){1,4}$', line):
                        return line
                
                for line in lines:
                    if any(keyword in line.upper() for keyword in skip_keywords):
                        continue
                    if re.match(r'^[A-Z]+(\s+[A-Z]+){1,4}$', line) and len(line) > 3:
                        return line.title()
                
                for line in lines:
                    if any(keyword in line.upper() for keyword in skip_keywords):
                        continue
                    if re.match(r'^[A-Za-z\s]+$', line) and len(line.split()) >= 2 and len(line) > 5:
                        return line.title()
            
            elif document_type == 'pan':
                skip_pan_keywords = ['INCOME', 'TAX', 'DEPARTMENT', 'PERMANENT', 'ACCOUNT', 'GOVERNMENT', 'INDIA', 'CARD', 'NUMBER']
                
                for i, line in enumerate(lines):
                    if 'NAME:' in line.upper() or line.upper().strip() == 'NAME':
                        for j in range(i+1, min(i+3, len(lines))):
                            name_line = lines[j].strip()
                            if (re.match(r'^[A-Z\s]+$', name_line) and len(name_line) > 3 and 
                                not any(keyword in name_line.upper() for keyword in skip_pan_keywords)):
                                return name_line.title()
                
                for line in lines:
                    if 'NAME:' in line.upper():
                        name_part = line.split(':', 1)[-1].strip()
                        if (len(name_part) > 3 and re.match(r'^[A-Z\s]+$', name_part) and
                            not any(keyword in name_part.upper() for keyword in skip_pan_keywords)):
                            return name_part.title()
                
                for line in lines:
                    if (re.match(r'^[A-Z]+(\s+[A-Z]+){1,4}$', line) and len(line) > 5 and
                        not any(keyword in line.upper() for keyword in skip_pan_keywords) and
                        len(line.split()) >= 2 and len(line.split()) <= 5):
                        return line.title()
            
            return None
        except Exception as e:
            return None
    
    def detect_document_type(self, text: str) -> str:
        """Detect if document is Aadhaar or PAN based on content"""
        text_upper = text.upper()
        
        # Check for Aadhaar indicators
        aadhaar_keywords = ['AADHAAR', 'UNIQUE IDENTIFICATION', 'UIDAI', 'VID']
        aadhaar_score = sum(1 for keyword in aadhaar_keywords if keyword in text_upper)
        
        # Check for PAN indicators  
        pan_keywords = ['INCOME TAX', 'PERMANENT ACCOUNT', 'PAN']
        pan_score = sum(1 for keyword in pan_keywords if keyword in text_upper)
        
        # Check for number patterns
        if re.search(r'\b\d{4}\s*\d{4}\s*\d{4}\b', text):  # 12-digit Aadhaar pattern
            aadhaar_score += 2
        if re.search(r'\b[A-Z]{5}\d{4}[A-Z]\b', text):  # PAN pattern
            pan_score += 2
            
        if aadhaar_score > pan_score:
            return 'aadhaar'
        elif pan_score > aadhaar_score:
            return 'pan'
        else:
            return 'unknown'
    
    def validate_documents(self, aadhaar_path: str, pan_path: str, profile_aadhaar: str, profile_pan: str, profile_name: str = None) -> Dict[str, Any]:
        """Validate extracted document numbers against profile information"""
        results = {
            'aadhaar_validation': {'status': 'not_processed', 'extracted': None, 'profile': profile_aadhaar, 'match': False, 'extracted_name': None},
            'pan_validation': {'status': 'not_processed', 'extracted': None, 'profile': profile_pan, 'match': False, 'extracted_name': None}
        }
        
        extracted_name_from_pan = None  # Store PAN extracted name
        
        # Process first document
        if aadhaar_path and os.path.exists(aadhaar_path):
            print(f"\nProcessing first document: {os.path.basename(aadhaar_path)}")
            text1 = self.extract_text_from_file(aadhaar_path)
            doc1_type = self.detect_document_type(text1) if text1 else 'unknown'
            print(f"Detected document type: {doc1_type}")
            
            if text1 and doc1_type == 'aadhaar':
                extracted_aadhaar = self.extract_aadhaar_number(text1)
                extracted_name = self.extract_name_from_text(text1, 'aadhaar')
                results['aadhaar_validation']['extracted'] = extracted_aadhaar
                results['aadhaar_validation']['extracted_name'] = extracted_name
                results['aadhaar_validation']['status'] = 'processed'
                
                print(f"Extracted Aadhaar Number: {extracted_aadhaar}")
                print(f"Extracted Name: {extracted_name}")
                
                if extracted_aadhaar and profile_aadhaar:
                    clean_extracted = re.sub(r'\s+', '', str(extracted_aadhaar))
                    clean_profile = re.sub(r'\s+', '', str(profile_aadhaar))
                    
                    if clean_extracted == clean_profile:
                        results['aadhaar_validation']['match'] = True
                        print("SUCCESS: Aadhaar numbers match!")
                    else:
                        print("ERROR: Aadhaar numbers don't match!")
            elif text1 and doc1_type == 'pan':
                extracted_pan = self.extract_pan_number(text1)
                extracted_name = self.extract_name_from_text(text1, 'pan')
                results['pan_validation']['extracted'] = extracted_pan
                results['pan_validation']['extracted_name'] = extracted_name
                results['pan_validation']['status'] = 'processed'
                
                print(f"Extracted PAN Number: {extracted_pan}")
                print(f"Extracted Name: {extracted_name}")
                
                if extracted_pan and profile_pan:
                    clean_extracted = re.sub(r'\s+', '', str(extracted_pan))
                    clean_profile = re.sub(r'\s+', '', str(profile_pan))
                    
                    if clean_extracted.upper() == clean_profile.upper():
                        results['pan_validation']['match'] = True
                        print("SUCCESS: PAN numbers match!")
                    else:
                        print("ERROR: PAN numbers don't match!")
        
        # Process second document
        if pan_path and os.path.exists(pan_path):
            print(f"\nProcessing second document: {os.path.basename(pan_path)}")
            text2 = self.extract_text_from_file(pan_path)
            doc2_type = self.detect_document_type(text2) if text2 else 'unknown'
            print(f"Detected document type: {doc2_type}")
            
            if text2 and doc2_type == 'aadhaar' and not results['aadhaar_validation']['extracted']:
                extracted_aadhaar = self.extract_aadhaar_number(text2)
                extracted_name = self.extract_name_from_text(text2, 'aadhaar')
                results['aadhaar_validation']['extracted'] = extracted_aadhaar
                results['aadhaar_validation']['extracted_name'] = extracted_name
                results['aadhaar_validation']['status'] = 'processed'
                
                print(f"Extracted Aadhaar Number: {extracted_aadhaar}")
                print(f"Extracted Name: {extracted_name}")
                
                if extracted_aadhaar and profile_aadhaar:
                    clean_extracted = re.sub(r'\s+', '', str(extracted_aadhaar))
                    clean_profile = re.sub(r'\s+', '', str(profile_aadhaar))
                    
                    if clean_extracted == clean_profile:
                        results['aadhaar_validation']['match'] = True
                        print("SUCCESS: Aadhaar numbers match!")
                    else:
                        print("ERROR: Aadhaar numbers don't match!")
            elif text2 and doc2_type == 'pan' and not results['pan_validation']['extracted']:
                extracted_pan = self.extract_pan_number(text2)
                extracted_name_from_pan = self.extract_name_from_text(text2, 'pan')
                results['pan_validation']['extracted'] = extracted_pan
                results['pan_validation']['extracted_name'] = extracted_name_from_pan
                results['pan_validation']['status'] = 'processed'
                
                print(f"Extracted PAN Number: {extracted_pan}")
                print(f"Extracted Name: {extracted_name_from_pan}")
                
                if extracted_pan and profile_pan:
                    clean_extracted = re.sub(r'\s+', '', str(extracted_pan))
                    clean_profile = re.sub(r'\s+', '', str(profile_pan))
                    
                    if clean_extracted.upper() == clean_profile.upper():
                        results['pan_validation']['match'] = True
                        print("SUCCESS: PAN numbers match!")
                    else:
                        print("ERROR: PAN numbers don't match!")
        
        # Use PAN extracted name for comparison if available
        if extracted_name_from_pan:
            results['aadhaar_validation']['extracted_name'] = extracted_name_from_pan
        
        return results