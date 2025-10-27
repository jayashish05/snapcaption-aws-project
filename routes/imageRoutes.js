const express = require('express');
const multer = require('multer');
const { v4: uuidv4 } = require('uuid');
const { uploadImageToS3, getSignedImageUrl } = require('../services/s3Service');
const { saveImageMetadata, getAllImages, updateImageCaption, searchImages } = require('../services/dynamoService');
const { generateCaption, regenerateCaptionFromUrl } = require('../services/geminiService');
const { requireAuth } = require('../middleware/authMiddleware');

const router = express.Router();

// Configure multer for memory storage
const storage = multer.memoryStorage();
const upload = multer({
  storage: storage,
  limits: {
    fileSize: 5 * 1024 * 1024, // 5MB limit
  },
  fileFilter: (req, file, cb) => {
    // Accept images only
    if (!file.mimetype.startsWith('image/')) {
      return cb(new Error('Only image files are allowed!'), false);
    }
    cb(null, true);
  },
});

/**
 * GET / - Home page with gallery
 */
router.get('/', requireAuth, async (req, res, next) => {
  try {
    const userId = req.session.user.userId;
    const images = await getAllImages(userId);
    
    // Generate signed URLs for all images
    const imagesWithSignedUrls = await Promise.all(
      images.map(async (image) => ({
        ...image,
        imageUrl: await getSignedImageUrl(image.imageUrl),
      }))
    );
    
    res.render('index', { 
      images: imagesWithSignedUrls, 
      totalCount: images.length,
      searchTerm: '',
      user: req.session.user,
    });
  } catch (error) {
    next(error);
  }
});

/**
 * POST /generate-caption - Generate caption without saving
 */
router.post('/generate-caption', requireAuth, upload.single('image'), async (req, res, next) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'No image file provided' });
    }

    // Generate caption using Gemini
    const caption = await generateCaption(req.file.buffer, req.file.mimetype);
    
    // Don't send image data back - frontend already has it
    // This prevents Lambda response size limit (6MB) issues
    res.json({
      success: true,
      caption: caption,
      mimeType: req.file.mimetype,
      originalName: req.file.originalname,
    });
  } catch (error) {
    next(error);
  }
});

/**
 * POST /save-image - Save image to S3 and caption to DynamoDB
 */
router.post('/save-image', requireAuth, async (req, res, next) => {
  try {
    const { imageBuffer, caption, mimeType, originalName } = req.body;
    const userId = req.session.user.userId;
    
    if (!imageBuffer || !caption) {
      return res.status(400).json({ error: 'Image and caption are required' });
    }

    const imageId = uuidv4();
    const buffer = Buffer.from(imageBuffer, 'base64');
    
    // Upload to S3
    const imageUrl = await uploadImageToS3(buffer, originalName, mimeType);
    
    // Save metadata to DynamoDB with userId
    const savedItem = await saveImageMetadata(imageId, imageUrl, caption, userId);
    
    res.json({
      success: true,
      image: savedItem,
    });
  } catch (error) {
    next(error);
  }
});

/**
 * POST /regenerate-caption/:id - Regenerate caption for an existing image
 */
router.post('/regenerate-caption/:id', requireAuth, async (req, res, next) => {
  try {
    const { id } = req.params;
    const { imageUrl } = req.body;

    if (!imageUrl) {
      return res.status(400).json({ error: 'Image URL is required' });
    }

    // Regenerate caption
    const newCaption = await regenerateCaptionFromUrl(imageUrl);
    
    // Update in DynamoDB
    const updatedItem = await updateImageCaption(id, newCaption);
    
    res.json({
      success: true,
      caption: newCaption,
      image: updatedItem,
    });
  } catch (error) {
    next(error);
  }
});

/**
 * GET /search - Search images by caption or date
 */
router.get('/search', requireAuth, async (req, res, next) => {
  try {
    const { q } = req.query;
    const userId = req.session.user.userId;
    const images = await searchImages(q, userId);
    
    // Generate signed URLs for all images
    const imagesWithSignedUrls = await Promise.all(
      images.map(async (image) => ({
        ...image,
        imageUrl: await getSignedImageUrl(image.imageUrl),
      }))
    );
    
    res.render('index', { 
      images: imagesWithSignedUrls, 
      totalCount: images.length,
      searchTerm: q || '',
      user: req.session.user,
    });
  } catch (error) {
    next(error);
  }
});

module.exports = router;
