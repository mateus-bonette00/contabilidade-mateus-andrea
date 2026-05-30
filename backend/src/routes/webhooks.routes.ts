import { Router } from 'express';
import { receberWebhookPluggy } from '../controllers/webhooks.controller';

export const webhooksRouter = Router();

webhooksRouter.post('/pluggy', receberWebhookPluggy);
