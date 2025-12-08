import easyocr
import fitz  # PyMuPDF
import os
from PIL import Image

def convert_pdf_to_image(pdf_path):
    """Convert PDF to image and return image path"""
    try:
        # Open PDF
        doc = fitz.open(pdf_path)
        page = doc[0]  # Get first page
        
        # Convert to image
        pix = page.get_pixmap()
        img_data = pix.tobytes("png")
        
        # Save as temporary image
        img_path = pdf_path.replace('.pdf', '_temp.png')
        with open(img_path, 'wb') as f:
            f.write(img_data)
        
        doc.close()
        return img_path
    except Exception as e:
        print(f"Error converting PDF: {e}")
        return None

def extract_text_from_file(file_path):
    """Extract text from file (PDF or image)"""
    # Initialize the OCR reader
    reader = easyocr.Reader(['en'])
    
    # Check if file is PDF
    if file_path.lower().endswith('.pdf'):
        print("Converting PDF to image...")
        img_path = convert_pdf_to_image(file_path)
        if img_path is None:
            print("Failed to convert PDF")
            return
        file_to_read = img_path
    else:
        file_to_read = file_path
    
    # Extract text using EasyOCR
    print(f"Extracting text from: {file_to_read}")
    result = reader.readtext(file_to_read)
    
    # Print the extracted text
    print("\n=== EXTRACTED TEXT ===")
    for detection in result:
        print(detection[1])
    
    # Clean up temporary image if created
    if file_path.lower().endswith('.pdf') and os.path.exists(file_to_read):
        os.remove(file_to_read)
        print(f"\nTemporary image {file_to_read} deleted")

# Test with your file
file_name = 'Aadhar Card.jpg'  # Change this to your file name
extract_text_from_file(file_name)