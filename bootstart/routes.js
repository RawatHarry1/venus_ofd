// bootstart/routes.js
const express = require('express');
const router = express.Router();
const Joi = require('joi');

// Simulating a database with an array
let items = [];

// Validation Schema
const itemSchema = Joi.object({
  name: Joi.string().min(3).required(),
  description: Joi.string().min(5).required(),
});

// Create Item (POST)
router.post('/items', (req, res) => {
  const { error } = itemSchema.validate(req.body);
  if (error) {
    return res.status(400).send({ message: error.details[0].message });
  }

  const item = {
    id: items.length + 1,
    name: req.body.name,
    description: req.body.description,
  };

  items.push(item);
  res.status(201).send(item);
});

// Read All Items (GET)
router.get('/items', (req, res) => {
  res.status(200).send(items);
});

// Read Single Item (GET)
router.get('/items/:id', (req, res) => {
  const item = items.find((i) => i.id === parseInt(req.params.id));
  if (!item) return res.status(404).send({ message: 'Item not found' });
  res.status(200).send(item);
});

// Update Item (PUT)
router.put('/items/:id', (req, res) => {
  const item = items.find((i) => i.id === parseInt(req.params.id));
  if (!item) return res.status(404).send({ message: 'Item not found' });

  const { error } = itemSchema.validate(req.body);
  if (error) {
    return res.status(400).send({ message: error.details[0].message });
  }

  item.name = req.body.name;
  item.description = req.body.description;
  res.status(200).send(item);
});

// Delete Item (DELETE)
router.delete('/items/:id', (req, res) => {
  const itemIndex = items.findIndex((i) => i.id === parseInt(req.params.id));
  if (itemIndex === -1)
    return res.status(404).send({ message: 'Item not found' });

  const deletedItem = items.splice(itemIndex, 1);
  res.status(200).send(deletedItem);
});

module.exports = router;
