import { ref, uploadBytes, getDownloadURL, deleteObject } from 'firebase/storage';
import { storage } from './config';

// File upload function
export const uploadFile = async (file, path, metadata = {}) => {
  try {
    // Create a reference to the file
    const storageRef = ref(storage, path);
    
    // Upload the file
    const snapshot = await uploadBytes(storageRef, file, metadata);
    
    // Get the download URL
    const downloadURL = await getDownloadURL(snapshot.ref);
    
    return {
      success: true,
      data: {
        name: snapshot.ref.name,
        fullPath: snapshot.ref.fullPath,
        downloadURL,
        size: file.size,
        type: file.type,
        metadata: snapshot.metadata
      }
    };
  } catch (error) {
    console.error('Upload file error:', error);
    return {
      success: false,
      error: error.message
    };
  }
};

// Delete file function
export const deleteFile = async (path) => {
  try {
    const storageRef = ref(storage, path);
    await deleteObject(storageRef);
    
    return { success: true };
  } catch (error) {
    console.error('Delete file error:', error);
    return {
      success: false,
      error: error.message
    };
  }
};

// Upload profile image
export const uploadProfileImage = async (file, userId) => {
  const timestamp = Date.now();
  const fileName = `profile-${userId}-${timestamp}.${file.name.split('.').pop()}`;
  const path = `profile-images/${fileName}`;
  
  return await uploadFile(file, path, {
    contentType: file.type,
    customMetadata: {
      userId,
      type: 'profile-image'
    }
  });
};

// Upload dispute evidence
export const uploadDisputeEvidence = async (file, disputeId, evidenceType) => {
  const timestamp = Date.now();
  const fileName = `evidence-${disputeId}-${timestamp}.${file.name.split('.').pop()}`;
  const path = `disputes/${disputeId}/evidence/${fileName}`;
  
  return await uploadFile(file, path, {
    contentType: file.type,
    customMetadata: {
      disputeId,
      type: 'dispute-evidence',
      evidenceType
    }
  });
};

// Upload event media
export const uploadEventMedia = async (file, eventId, mediaType) => {
  const timestamp = Date.now();
  const fileName = `${mediaType}-${eventId}-${timestamp}.${file.name.split('.').pop()}`;
  const path = `events/${eventId}/media/${fileName}`;
  
  return await uploadFile(file, path, {
    contentType: file.type,
    customMetadata: {
      eventId,
      type: 'event-media',
      mediaType
    }
  });
};

// Upload announcement attachment
export const uploadAnnouncementAttachment = async (file, announcementId) => {
  const timestamp = Date.now();
  const fileName = `attachment-${announcementId}-${timestamp}.${file.name.split('.').pop()}`;
  const path = `announcements/${announcementId}/attachments/${fileName}`;
  
  return await uploadFile(file, path, {
    contentType: file.type,
    customMetadata: {
      announcementId,
      type: 'announcement-attachment'
    }
  });
};

// Upload community document
export const uploadCommunityDocument = async (file, communityId, documentType) => {
  const timestamp = Date.now();
  const fileName = `${documentType}-${communityId}-${timestamp}.${file.name.split('.').pop()}`;
  const path = `communities/${communityId}/documents/${fileName}`;
  
  return await uploadFile(file, path, {
    contentType: file.type,
    customMetadata: {
      communityId,
      type: 'community-document',
      documentType
    }
  });
};

// Get file download URL
export const getFileDownloadURL = async (path) => {
  try {
    const storageRef = ref(storage, path);
    const downloadURL = await getDownloadURL(storageRef);
    
    return {
      success: true,
      data: { downloadURL }
    };
  } catch (error) {
    console.error('Get download URL error:', error);
    return {
      success: false,
      error: error.message
    };
  }
};

// File type validation
export const validateFileType = (file, allowedTypes) => {
  return allowedTypes.includes(file.type);
};

export const validateFileSize = (file, maxSizeInMB) => {
  const maxSizeInBytes = maxSizeInMB * 1024 * 1024;
  return file.size <= maxSizeInBytes;
};

// Allowed file types
export const ALLOWED_FILE_TYPES = {
  IMAGES: ['image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/webp'],
  DOCUMENTS: [
    'application/pdf',
    'application/msword',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'text/plain'
  ],
  AUDIO: ['audio/mpeg', 'audio/wav', 'audio/ogg', 'audio/mp3'],
  VIDEO: ['video/mp4', 'video/avi', 'video/mov', 'video/wmv']
};

// File size limits (in MB)
export const FILE_SIZE_LIMITS = {
  PROFILE_IMAGE: 5,
  EVIDENCE: 10,
  EVENT_MEDIA: 50,
  ANNOUNCEMENT_ATTACHMENT: 10,
  COMMUNITY_DOCUMENT: 20
};

// Utility function to get file type category
export const getFileTypeCategory = (fileType) => {
  if (ALLOWED_FILE_TYPES.IMAGES.includes(fileType)) return 'image';
  if (ALLOWED_FILE_TYPES.DOCUMENTS.includes(fileType)) return 'document';
  if (ALLOWED_FILE_TYPES.AUDIO.includes(fileType)) return 'audio';
  if (ALLOWED_FILE_TYPES.VIDEO.includes(fileType)) return 'video';
  return 'other';
};

// Utility function to format file size
export const formatFileSize = (bytes) => {
  if (bytes === 0) return '0 Bytes';
  
  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
};
