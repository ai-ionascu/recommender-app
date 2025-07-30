import { Router } from 'express';
import { ImageController } from '../controllers/image.controller.js';
import { validateImages } from '../validations/image.validation.js';

const router = Router({ mergeParams: true });

// List / add / set main / delete images
router.get('/', ImageController.list);
router.post('/', validateImages, ImageController.add);
router.put('/set-main', ImageController.setMain);
router.delete('/:imageId', ImageController.remove);

export default router;
