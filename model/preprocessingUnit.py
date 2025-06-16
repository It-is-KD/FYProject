import cv2
import numpy as np
import os
import torch
from facenet_pytorch import MTCNN
from typing import Tuple, List, Dict, Union, Optional
from dataclasses import dataclass
from pathlib import Path
import math
from PIL import Image


@dataclass
class ProcessedFace:
    """Data class to store processed face information"""
    face_image: np.ndarray
    original_filename: str
    confidence: float
    face_id: int  # To distinguish multiple faces from same image
    bbox: Tuple[int, int, int, int]
    quality_score: float = 0.0  # Added quality score field


class FacePreprocessor:
    def __init__(self, 
                 target_size: Tuple[int, int] = (224, 224), 
                 use_mtcnn: bool = True, 
                 normalize_range: Tuple[float, float] = (-1, 1),  # Changed default to (-1, 1) for better model performance
                 device: str = 'cuda:0',
                 confidence_threshold: float = 0.85,  # Slightly lower threshold to detect more faces
                 margin_percent: float = 0.25,  # Increased margin for better face alignment
                 quality_threshold: float = 0.5):  # Added quality threshold parameter
        """
        Initialize the face preprocessing pipeline with enhanced MTCNN

        Args:
            target_size: Output size for face images
            use_mtcnn: If True, use MTCNN for face detection/alignment
            normalize_range: Range for pixel normalization
            device: Device to run MTCNN on ('cpu', 'cuda:0', etc.)
            confidence_threshold: Minimum confidence threshold for face detection
            margin_percent: Percentage of face size to add as margin
            quality_threshold: Minimum quality score for face acceptance
        """
        self.target_size = target_size
        self.normalize_range = normalize_range
        self.confidence_threshold = confidence_threshold
        self.margin_percent = margin_percent
        self.quality_threshold = quality_threshold

        # Set device based on availability
        if torch.cuda.is_available() and 'cuda' in device:
            self.device = device
            print(f"Using GPU device: {device}")
        else:
            self.device = 'cpu'
            print("CUDA not available, using CPU")

        # Initialize MTCNN face detector with optimized parameters
        if use_mtcnn:
            try:
                self.face_detector = MTCNN(
                    image_size=target_size[0],
                    margin=int(target_size[0] * margin_percent),  # Dynamic margin based on image size
                    min_face_size=20,
                    thresholds=[0.6, 0.7, 0.8],  # Adjusted thresholds for better detection
                    factor=0.709,  # Scale factor for image pyramid
                    post_process=True,
                    keep_all=True,  # Keep all detected faces
                    device=self.device,
                    select_largest=False  # Don't just select largest face
                )
                print(f"Enhanced MTCNN initialized on device: {self.device}")
            except Exception as e:
                print(f"Error initializing MTCNN: {e}")
                raise RuntimeError(f"Failed to initialize MTCNN: {e}")
        else:
            raise ValueError("Only MTCNN is supported in this version")

    def detect_faces(self, image: np.ndarray) -> List[Dict]:
        """
        Detect faces in an image and return their bounding boxes and landmarks

        Args:
            image: BGR image from OpenCV

        Returns:
            List of dictionaries containing bbox, confidence, and landmarks
        """
        # Convert BGR to RGB for PyTorch MTCNN
        rgb_image = cv2.cvtColor(image, cv2.COLOR_BGR2RGB)

        # Detect faces using MTCNN with GPU acceleration
        with torch.no_grad():  # Disable gradient calculation for inference
            boxes, probs, landmarks = self.face_detector.detect(rgb_image, landmarks=True)

        detections = []
        if boxes is not None and len(boxes) > 0:
            for i, (box, prob, landmark) in enumerate(zip(boxes, probs, landmarks)):
                # Skip faces with low confidence
                if prob < self.confidence_threshold:
                    continue
                
                # Convert box from [x1, y1, x2, y2] to [x, y, w, h]
                x1, y1, x2, y2 = box.astype(int)
                x, y, w, h = int(x1), int(y1), int(x2-x1), int(y2-y1)

                # Extract landmarks
                landmarks_dict = {
                    'left_eye': (int(landmark[0][0]), int(landmark[0][1])),
                    'right_eye': (int(landmark[1][0]), int(landmark[1][1])),
                    'nose': (int(landmark[2][0]), int(landmark[2][1])),
                    'mouth_left': (int(landmark[3][0]), int(landmark[3][1])),
                    'mouth_right': (int(landmark[4][0]), int(landmark[4][1]))
                }

                # Set a default quality score since we're removing quality assessment
                quality_score = 1.0

                detections.append({
                    'bbox': [x, y, w, h],
                    'confidence': float(prob),
                    'landmarks': landmarks_dict,
                    'quality_score': quality_score
                })

        return detections

    def assess_face_quality(self, image: np.ndarray, bbox: np.ndarray, landmarks: Dict) -> float:
        """
        Simplified face quality assessment - returns a constant value
        
        Args:
            image: Input RGB image
            bbox: Bounding box coordinates [x1, y1, x2, y2]
            landmarks: Dictionary containing facial landmarks
            
        Returns:
            Quality score (always 1.0 as we're removing quality assessment)
        """
        # Return a constant value since we're removing quality assessment
        return 1.0

    def normalize_image(self, image: np.ndarray) -> np.ndarray:
        """
        Enhanced normalization with adaptive histogram equalization and color correction

        Args:
            image: Input image

        Returns:
            Normalized image
        """
        min_val, max_val = self.normalize_range
        image = image.astype(np.float32)

        # Apply advanced preprocessing techniques
        if len(image.shape) == 3:  # Color image
            # Convert to uint8 for preprocessing operations
            img_uint8 = np.clip(image, 0, 255).astype(np.uint8)
            
            # 1. Convert to LAB color space for better color processing
            lab_image = cv2.cvtColor(img_uint8, cv2.COLOR_BGR2LAB)
            l_channel, a_channel, b_channel = cv2.split(lab_image)
            
            # 2. Apply CLAHE (Contrast Limited Adaptive Histogram Equalization) to L channel
            clahe = cv2.createCLAHE(clipLimit=2.0, tileGridSize=(8, 8))
            enhanced_l_channel = clahe.apply(l_channel)
            
            # 3. Merge channels back and convert back to BGR
            enhanced_lab_image = cv2.merge([enhanced_l_channel, a_channel, b_channel])
            enhanced_image = cv2.cvtColor(enhanced_lab_image, cv2.COLOR_LAB2BGR)
            
            # 4. Apply subtle color correction to improve skin tones
            # Slightly increase red channel for better skin tone representation
            b, g, r = cv2.split(enhanced_image)
            r = np.clip(r * 1.05, 0, 255).astype(np.uint8)  # Boost red channel by 5%
            enhanced_image = cv2.merge([b, g, r])
            
            # 5. Apply subtle bilateral filtering to reduce noise while preserving edges
            enhanced_image = cv2.bilateralFilter(enhanced_image, 5, 35, 35)
            
            # Convert back to float32 for normalization
            image = enhanced_image.astype(np.float32)
        else:  # Grayscale image
            # Make sure image is in uint8 format for cv2.equalizeHist
            img_uint8 = np.clip(image, 0, 255).astype(np.uint8)
            
            # Apply CLAHE for grayscale images
            clahe = cv2.createCLAHE(clipLimit=2.0, tileGridSize=(8, 8))
            image = clahe.apply(img_uint8).astype(np.float32)

        # Normalize to target range
        if min_val == -1 and max_val == 1:
            # Normalize to [-1, 1] range for better neural network performance
            image = (image / 127.5) - 1
        else:
            # Normalize to [0, 1] range
            image = image / 255.0
            # Scale to target range if not [0, 1]
            if min_val != 0 or max_val != 1:
                image = image * (max_val - min_val) + min_val

        return image

    def extract_face(self, image: np.ndarray, detection: Dict) -> np.ndarray:
        """
        Extract face from image using detection bbox with improved margin handling

        Args:
            image: Input image
            detection: Face detection data with bbox

        Returns:
            Extracted face image
        """
        try:
            x, y, w, h = detection['bbox']

            # Add margin based on class parameter
            margin_x = int(w * self.margin_percent)
            margin_y = int(h * self.margin_percent)

            # Ensure coordinates stay within image bounds
            x1 = max(0, x - margin_x)
            y1 = max(0, y - margin_y)
            x2 = min(image.shape[1], x + w + margin_x)
            y2 = min(image.shape[0], y + h + margin_y)

            # Extract face region with margin
            face = image[y1:y2, x1:x2]

            # If extraction failed or resulted in empty image, return resized original image
            if face.size == 0:
                print("Warning: Face extraction resulted in empty image. Using full image.")
                return cv2.resize(image, self.target_size)

            # Resize the extracted face to the target size
            resized_face = cv2.resize(face, self.target_size, interpolation=cv2.INTER_CUBIC)
            
            return resized_face
        except Exception as e:
            print(f"Error in face extraction: {e}. Using full image.")
            return cv2.resize(image, self.target_size)

    def preprocess_face(self, image: np.ndarray, detection: Dict) -> np.ndarray:
        """
        Complete face preprocessing pipeline with white background isolation

        Args:
            image: Input image
            detection: Detection data with bbox and landmarks

        Returns:
            Preprocessed face image
        """
        # Extract face with margin and resize to target size
        face = self.extract_face(image, detection)
        
        # Apply white background isolation
        face_white_bg = self.isolate_face_white_background(face)
        
        # Normalize pixel values with enhanced preprocessing
        normalized_face = self.normalize_image(face_white_bg)
        
        return normalized_face

    def process_image(self, 
                      image: np.ndarray, 
                      return_all_faces: bool = False) -> Union[np.ndarray, List[np.ndarray], None]:
        """
        Process an image and return preprocessed face(s) - Modified to always return all faces when requested

        Args:
            image: Input image
            return_all_faces: If True, return all detected faces

        Returns:
            Single preprocessed face or list of preprocessed faces
        """
        # Detect faces
        detections = self.detect_faces(image)
        if not detections:
            return None

        # Process each detected face
        processed_faces = []
        for detection in detections:
            processed_face = self.preprocess_face(image, detection)
            processed_faces.append(processed_face)

        if return_all_faces:
            # Always return all processed faces when requested
            return processed_faces
        
        # Return the face with highest confidence if not returning all
        if len(detections) > 1:
            highest_confidence_idx = max(range(len(detections)), 
                                     key=lambda i: detections[i]['confidence'])
            return processed_faces[highest_confidence_idx]
        else:
            # If only one face, return it
            return processed_faces[0]

    def process_directory(self,
                      input_dir: str,
                      save_dir: str = None) -> List[ProcessedFace]:
        """
        Process all images in a directory with parallel processing

        Args:
            input_dir: Directory containing input images
            save_dir: Optional directory to save processed faces

        Returns:
            List of ProcessedFace objects containing processed faces and their metadata
        """
        processed_faces = []
        failed_images = []

        # Create save directory if specified
        if save_dir:
            os.makedirs(save_dir, exist_ok=True)

        # Process each image in the directory
        for filename in os.listdir(input_dir):
            if filename.lower().endswith(('.png', '.jpg', '.jpeg', '.bmp', '.tiff', '.tif')):
                image_path = os.path.join(input_dir, filename)
                try:
                    # Try reading with OpenCV first
                    image = cv2.imread(image_path)
                    
                    # If OpenCV fails, try alternative methods
                    if image is None:
                        print(f"OpenCV failed to read image: {filename}, trying alternative methods...")
                        
                        # Check if file exists and has content
                        if not os.path.exists(image_path):
                            print(f"Error: File does not exist: {filename}")
                            failed_images.append((filename, "File does not exist"))
                            continue
                            
                        file_size = os.path.getsize(image_path)
                        if file_size == 0:
                            print(f"Error: File is empty (0 bytes): {filename}")
                            failed_images.append((filename, "Empty file (0 bytes)"))
                            continue
                        
                        # Try PIL/Pillow
                        try:
                            from PIL import Image, UnidentifiedImageError
                            try:
                                pil_image = Image.open(image_path)
                                img_format = pil_image.format
                                pil_image = pil_image.convert('RGB')
                                image = np.array(pil_image)
                                image = cv2.cvtColor(image, cv2.COLOR_RGB2BGR)
                                print(f"Successfully loaded image using PIL: {filename} (Format: {img_format})")
                            except UnidentifiedImageError:
                                print(f"PIL Error: Unidentified image format in file: {filename}")
                                failed_images.append((filename, "Unidentified image format"))
                                continue
                            except Exception as pil_error:
                                print(f"PIL Error: {str(pil_error)} when reading: {filename}")
                                
                                # Try imageio as a last resort
                                try:
                                    import imageio
                                    image = imageio.imread(image_path)
                                    if len(image.shape) == 3 and image.shape[2] == 3:
                                        image = cv2.cvtColor(image, cv2.COLOR_RGB2BGR)
                                    print(f"Successfully loaded image using imageio: {filename}")
                                except ImportError:
                                    print("imageio library not available for fallback image loading")
                                    failed_images.append((filename, f"PIL error: {str(pil_error)}, imageio not available"))
                                    continue
                                except Exception as imageio_error:
                                    print(f"All image loading methods failed for: {filename}")
                                    print(f"Detailed error: {str(imageio_error)}")
                                    failed_images.append((filename, f"All loading methods failed: {str(imageio_error)}"))
                                    continue
                        except ImportError:
                            print("PIL/Pillow library not available for fallback image loading")
                            failed_images.append((filename, "OpenCV failed and PIL not available"))
                            continue
                    
                    if image is None:
                        print(f"All image loading methods failed for: {filename}")
                        failed_images.append((filename, "Unknown image loading failure"))
                        continue

                    # Detect and process faces
                    detections = self.detect_faces(image)

                    if not detections:
                        print(f"No faces detected in image: {filename}")
                        failed_images.append((filename, "No faces detected"))
                        continue

                    for idx, detection in enumerate(detections):
                        # Process face
                        processed_face_img = self.preprocess_face(image, detection)

                        # Create ProcessedFace object
                        processed_face = ProcessedFace(
                            face_image=processed_face_img,
                            original_filename=filename,
                            confidence=detection['confidence'],
                            face_id=idx,
                            bbox=tuple(detection['bbox']),
                            quality_score=detection['quality_score']
                        )

                        processed_faces.append(processed_face)

                        # Save processed face if directory is specified
                        if save_dir:
                            base_name = Path(filename).stem
                            # Save as numpy array
                            np_save_path = os.path.join(
                                save_dir,
                                f"{base_name}_face_{idx}.npy"
                            )
                            np.save(np_save_path, processed_face_img)
                            
                            # Also save as image for visualization
                            img_save_path = os.path.join(
                                save_dir,
                                f"{base_name}_face_{idx}.jpg"
                            )
                            # Convert from normalized to 0-255 range for saving
                            save_img = ((processed_face_img - self.normalize_range[0]) / 
                                        (self.normalize_range[1] - self.normalize_range[0]) * 255).astype(np.uint8)
                            cv2.imwrite(img_save_path, save_img)

                except Exception as e:
                    print(f"Error processing {filename}: {str(e)}")
                    import traceback
                    traceback.print_exc()
                    failed_images.append((filename, f"Processing error: {str(e)}"))

        # Log summary of failed images
        if failed_images:
            print(f"\nFailed to process {len(failed_images)} images:")
            for filename, reason in failed_images:
                print(f"  - {filename}: {reason}")
        
        return processed_faces

    def preprocess_image(self, image_path):
        """
        Preprocess a single image with timeout protection and enhanced error handling
        
        Args:
            image_path: Path to the input image
            
        Returns:
            Preprocessed face image or None if no face detected
        """
        try:
            # Try reading with OpenCV first
            image = cv2.imread(image_path)
            
            # If OpenCV fails, try alternative methods
            if image is None:
                print(f"OpenCV failed to read image: {image_path}, trying alternative methods...")
                
                # Check if file exists
                if not os.path.exists(image_path):
                    print(f"Error: File does not exist: {image_path}")
                    return None
                    
                # Check file size
                file_size = os.path.getsize(image_path)
                if file_size == 0:
                    print(f"Error: File is empty (0 bytes): {image_path}")
                    return None
                
                # Try PIL/Pillow
                try:
                    from PIL import Image, UnidentifiedImageError
                    try:
                        pil_image = Image.open(image_path)
                        # Get image format for diagnostics
                        img_format = pil_image.format
                        # Convert to RGB (PIL uses RGB, OpenCV uses BGR)
                        pil_image = pil_image.convert('RGB')
                        # Convert PIL image to numpy array
                        image = np.array(pil_image)
                        # Convert RGB to BGR for OpenCV processing
                        image = cv2.cvtColor(image, cv2.COLOR_RGB2BGR)
                        print(f"Successfully loaded image using PIL: {image_path} (Format: {img_format})")
                    except UnidentifiedImageError:
                        print(f"PIL Error: Unidentified image format in file: {image_path}")
                        return None
                    except Exception as pil_error:
                        print(f"PIL Error: {str(pil_error)} when reading: {image_path}")
                        
                        # Try imageio as a last resort
                        try:
                            import imageio
                            image = imageio.imread(image_path)
                            # Convert to BGR for OpenCV if needed
                            if len(image.shape) == 3 and image.shape[2] == 3:
                                image = cv2.cvtColor(image, cv2.COLOR_RGB2BGR)
                            print(f"Successfully loaded image using imageio: {image_path}")
                        except ImportError:
                            print("imageio library not available for fallback image loading")
                            return None
                        except Exception as imageio_error:
                            print(f"All image loading methods failed for: {image_path}")
                            print(f"Detailed error: {str(imageio_error)}")
                            
                            # Provide diagnostic information about the file
                            try:
                                import magic
                                file_type = magic.from_file(image_path)
                                print(f"File type according to magic: {file_type}")
                            except ImportError:
                                print("python-magic library not available for file type detection")
                                
                            print(f"File size: {file_size} bytes")
                            return None
                except ImportError:
                    print("PIL/Pillow library not available for fallback image loading")
                    return None
            
            if image is None:
                print(f"All image loading methods failed for: {image_path}")
                return None
            
            # Process image using the enhanced pipeline
            return self.process_image(image)
            
        except Exception as e:
            print(f"Error preprocessing image {image_path}: {str(e)}")
            import traceback
            traceback.print_exc()
            return None

    def visualize_preprocessing(self, image: np.ndarray, save_dir: str = "preprocessing_steps") -> None:
        """
        Visualize and save each step of the preprocessing pipeline

        Args:
            image: Input image in BGR format
            save_dir: Directory to save the visualization steps
        """
        os.makedirs(save_dir, exist_ok=True)

        try:
            # Step 1: Save original image
            cv2.imwrite(os.path.join(save_dir, "1_original.jpg"), image)

            # Step 2: Convert to RGB (for MTCNN) and save
            rgb_image = cv2.cvtColor(image, cv2.COLOR_BGR2RGB)
            cv2.imwrite(os.path.join(save_dir, "2_rgb_converted.jpg"), cv2.cvtColor(rgb_image, cv2.COLOR_RGB2BGR))

            # Step 3: Detect faces and draw bounding boxes
            detections = self.detect_faces(image)
            visualization = image.copy()

            if not detections:
                print("No faces detected for visualization")
                cv2.putText(visualization, "No faces detected", (30, 30),
                            cv2.FONT_HERSHEY_SIMPLEX, 1, (0, 0, 255), 2)
                cv2.imwrite(os.path.join(save_dir, "3_no_face_detected.jpg"), visualization)
                return

            for det in detections:
                x, y, w, h = det['bbox']

                # Draw face bounding box
                cv2.rectangle(visualization, (x, y), (x + w, y + h), (0, 255, 0), 2)

                # Draw confidence score
                conf_text = f"Conf: {det['confidence']:.2f}"
                cv2.putText(visualization, conf_text, (x, y - 10),
                            cv2.FONT_HERSHEY_SIMPLEX, 0.5, (0, 255, 0), 2)

                # Draw landmarks
                for point_name, point in det['landmarks'].items():
                    color_map = {
                        'left_eye': (255, 0, 0),  # Blue
                        'right_eye': (255, 0, 0),  # Blue
                        'nose': (0, 255, 0),  # Green
                        'mouth_left': (0, 0, 255),  # Red
                        'mouth_right': (0, 0, 255)  # Red
                    }
                    cv2.circle(visualization, point, 3, color_map[point_name], -1)

            cv2.imwrite(os.path.join(save_dir, "3_face_detection.jpg"), visualization)

            # Process each detected face
            for idx, det in enumerate(detections):
                try:
                    # Step 4: Extract face with margin
                    face_img = self.extract_face(image, det)
                    cv2.imwrite(os.path.join(save_dir, f"4_extracted_face_{idx}.jpg"), face_img)

                    # Step 5: Save face with white background
                    try:
                        face_white_bg = self.isolate_face_white_background(face_img)
                        # Convert to visualization format
                        if self.normalize_range[0] < 0:
                            face_white_bg_vis = ((face_white_bg - self.normalize_range[0]) / 
                                             (self.normalize_range[1] - self.normalize_range[0]) * 255).astype(np.uint8)
                        else:
                            face_white_bg_vis = (face_white_bg * 255).astype(np.uint8)
                        cv2.imwrite(os.path.join(save_dir, f"5_white_background_{idx}.jpg"), face_white_bg_vis)
                    except Exception as e:
                        print(f"Warning: White background isolation failed during visualization: {e}")

                    # Step 6: Save normalized face (without histogram equalization for visualization)
                    # Simple normalization for visualization
                    normalized_vis = cv2.normalize(face_img, None, 0, 255, cv2.NORM_MINMAX).astype(np.uint8)
                    cv2.imwrite(os.path.join(save_dir, f"6_normalized_face_{idx}.jpg"), normalized_vis)

                    # Step 7: Full normalization (with proper error handling)
                    try:
                        normalized_face = self.normalize_image(face_white_bg)
                        # Convert back to 0-255 range for visualization
                        full_normalized_vis = ((normalized_face - self.normalize_range[0]) /
                                               (self.normalize_range[1] - self.normalize_range[0]) * 255).astype(
                            np.uint8)
                        cv2.imwrite(os.path.join(save_dir, f"7_full_normalized_face_{idx}.jpg"), full_normalized_vis)
                    except Exception as e:
                        print(f"Warning: Full normalization failed: {e}")

                except Exception as e:
                    print(f"Error processing face {idx}: {e}")

            print(f"Preprocessing visualization saved to {save_dir}")

        except Exception as e:
            print(f"Error during visualization: {e}")

    def isolate_face_white_background(self, face_image: np.ndarray) -> np.ndarray:
        """
        Isolate face with white background using elliptical mask and skin detection
        
        Args:
            face_image: Extracted face image
            
        Returns:
            Face image with white background
        """
        try:
            # Convert image to appropriate format if needed
            if face_image.dtype != np.uint8:
                # If normalized to [-1,1], convert back to [0,255]
                if self.normalize_range[0] < 0:
                    temp_img = ((face_image - self.normalize_range[0]) / 
                            (self.normalize_range[1] - self.normalize_range[0]) * 255).astype(np.uint8)
                else:
                    temp_img = (face_image * 255).astype(np.uint8)
            else:
                temp_img = face_image.copy()
                
            # Get image dimensions
            height, width = temp_img.shape[:2]
            
            # Step 1: Create a base elliptical mask centered on the face
            mask = np.zeros((height, width), dtype=np.uint8)
            
            # Create elliptical mask centered on the face
            center_x, center_y = width // 2, height // 2
            # Ellipse axes (face is typically taller than wide)
            axes_length = (int(width * 0.42), int(height * 0.55))
            # Draw filled white ellipse on black background
            cv2.ellipse(mask, (center_x, center_y), axes_length, 
                    0, 0, 360, (255), -1)
            
            # Step 2: Refine the mask using skin color detection
            if len(temp_img.shape) == 3:  # Color image
                # Convert to YCrCb color space which is better for skin detection
                ycrcb_img = cv2.cvtColor(temp_img, cv2.COLOR_BGR2YCrCb)
                # Define skin color range in YCrCb
                lower_skin = np.array([0, 135, 85], dtype=np.uint8)
                upper_skin = np.array([255, 180, 135], dtype=np.uint8)
                # Create skin mask
                skin_mask = cv2.inRange(ycrcb_img, lower_skin, upper_skin)
                
                # Combine the elliptical mask with skin detection mask
                combined_mask = cv2.bitwise_and(mask, skin_mask)
                
                # Apply morphological operations to clean up the mask
                kernel = cv2.getStructuringElement(cv2.MORPH_ELLIPSE, (5, 5))
                combined_mask = cv2.morphologyEx(combined_mask, cv2.MORPH_OPEN, kernel)
                combined_mask = cv2.morphologyEx(combined_mask, cv2.MORPH_CLOSE, kernel)
                
                # Dilate to include more of the face
                combined_mask = cv2.dilate(combined_mask, kernel, iterations=2)
            else:
                # For grayscale images, just use the elliptical mask
                combined_mask = mask
            
            # Step 3: Apply GrabCut algorithm for more precise segmentation
            try:
                if len(temp_img.shape) == 3:  # GrabCut only works on color images
                    # Create GrabCut mask
                    grabcut_mask = np.zeros(temp_img.shape[:2], dtype=np.uint8)
                    # Set combined_mask area as probable foreground
                    grabcut_mask[combined_mask > 0] = cv2.GC_PR_FGD
                    # Set outer area as probable background
                    border = 10
                    grabcut_mask[:border, :] = cv2.GC_BGD
                    grabcut_mask[-border:, :] = cv2.GC_BGD
                    grabcut_mask[:, :border] = cv2.GC_BGD
                    grabcut_mask[:, -border:] = cv2.GC_BGD
                    
                    # Apply GrabCut
                    bgd_model = np.zeros((1, 65), np.float64)
                    fgd_model = np.zeros((1, 65), np.float64)
                    rect = (border, border, width-2*border, height-2*border)
                    cv2.grabCut(temp_img, grabcut_mask, rect, bgd_model, fgd_model, 3, cv2.GC_INIT_WITH_MASK)
                    
                    # Create final mask
                    final_mask = np.where((grabcut_mask == cv2.GC_PR_FGD) | (grabcut_mask == cv2.GC_FGD), 255, 0).astype('uint8')
                else:
                    final_mask = combined_mask
            except Exception as e:
                print(f"GrabCut segmentation failed: {e}. Using simpler mask.")
                final_mask = combined_mask
            
            # Step 4: Apply Gaussian blur to the mask edges for smoother transition
            final_mask = cv2.GaussianBlur(final_mask, (15, 15), 0)
            
            # Create a white background image
            white_bg = np.ones_like(temp_img) * 255
            
            # Normalize mask to range [0, 1]
            mask_norm = final_mask.astype(float) / 255.0
            
            # Expand mask dimensions for broadcasting if image is color
            if len(temp_img.shape) == 3:
                mask_norm = np.expand_dims(mask_norm, axis=2)
                
            # Blend original image and white background using the mask
            result = (temp_img * mask_norm + white_bg * (1 - mask_norm)).astype(np.uint8)
                
            # Convert back to original format if needed
            if face_image.dtype != np.uint8:
                if self.normalize_range[0] < 0:
                    # Convert back to [-1,1] range
                    result = (result / 127.5) - 1
                else:
                    # Convert back to [0,1] range
                    result = result / 255.0
                    
            return result
            
        except Exception as e:
            print(f"White background isolation failed: {e}. Using original face image.")
            return face_image
