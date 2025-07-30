import { Router } from 'express';
import { FeatureController } from '../controllers/feature.controller.js';
import { validateFeatureBody } from '../validations/feature.validation.js';

const router = Router({ mergeParams: true });

// List / add / update / delete features
router.get('/', FeatureController.list);
router.post('/', validateFeatureBody, FeatureController.add);
router.put('/:featureId', validateFeatureBody, FeatureController.update);
router.delete('/:featureId', FeatureController.remove);

export default router;
