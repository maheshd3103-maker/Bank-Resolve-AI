import cv2
import numpy as np
import os
import logging
from typing import Dict, Any, Optional

logger = logging.getLogger(__name__)
logger.disabled = True

class FaceVerificationAgent:
    """Agent for face verification using OpenCV"""
    
    def __init__(self):
        try:
            self.face_cascade = cv2.CascadeClassifier(cv2.data.haarcascades + 'haarcascade_frontalface_default.xml')
        except Exception as e:
            self.face_cascade = None
    
    def extract_face_from_image(self, image_path: str) -> Optional[np.ndarray]:
        """Extract face from image"""
        try:
            img = cv2.imread(image_path)
            if img is None:
                return None
            
            gray = cv2.cvtColor(img, cv2.COLOR_BGR2GRAY)
            faces = self.face_cascade.detectMultiScale(gray, 1.1, 4)
            
            if len(faces) == 0:
                return None
            
            largest_face = max(faces, key=lambda x: x[2] * x[3])
            x, y, w, h = largest_face
            face_roi = gray[y:y+h, x:x+w]
            face_roi = cv2.resize(face_roi, (100, 100))
            
            return face_roi
            
        except Exception as e:
            return None
    
    def compare_faces(self, face1: np.ndarray, face2: np.ndarray) -> float:
        """Compare two face images and return similarity score"""
        try:
            face1_norm = cv2.equalizeHist(face1)
            face2_norm = cv2.equalizeHist(face2)
            
            hist1 = cv2.calcHist([face1_norm], [0], None, [256], [0, 256])
            hist2 = cv2.calcHist([face2_norm], [0], None, [256], [0, 256])
            
            correlation = cv2.compareHist(hist1, hist2, cv2.HISTCMP_CORREL)
            result = cv2.matchTemplate(face1_norm, face2_norm, cv2.TM_CCOEFF_NORMED)
            template_score = np.max(result)
            
            similarity = (correlation * 0.6 + template_score * 0.4)
            similarity = max(0, min(1, similarity))
            
            return similarity
            
        except Exception as e:
            return 0.0
    
    def verify_face_match(self, profile_photo_path: str, document_photo_path: str) -> Dict[str, Any]:
        """Verify if faces in two images match"""
        result = {
            'similarity_score': 0.0,
            'match': False,
            'status': 'not_processed',
            'message': ''
        }
        
        try:
            if self.face_cascade is None:
                result['status'] = 'error'
                result['message'] = 'Face detection not initialized'
                return result
            
            if not os.path.exists(profile_photo_path):
                result['status'] = 'error'
                result['message'] = 'Profile photo not found'
                return result
            
            if not os.path.exists(document_photo_path):
                result['status'] = 'error'
                result['message'] = 'Document photo not found'
                return result
            
            profile_face = self.extract_face_from_image(profile_photo_path)
            document_face = self.extract_face_from_image(document_photo_path)
            
            if profile_face is None:
                result['status'] = 'error'
                result['message'] = 'No face detected in profile photo'
                return result
            
            if document_face is None:
                result['status'] = 'error'
                result['message'] = 'No face detected in document photo'
                return result
            
            similarity = self.compare_faces(profile_face, document_face)
            result['similarity_score'] = round(similarity, 3)
            
            threshold = 0.7
            result['match'] = similarity >= threshold
            result['status'] = 'processed'
            
            if result['match']:
                result['message'] = f'Faces match with {similarity:.1%} similarity'
            else:
                result['message'] = f'Faces do not match (similarity: {similarity:.1%})'
            
            return result
            
        except Exception as e:
            result['status'] = 'error'
            result['message'] = f'Verification error: {str(e)}'
            return result