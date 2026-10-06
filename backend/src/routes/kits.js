const express = require('express');
const { authMiddleware } = require('../middleware/auth');
const Kit = require('../models/Kit');

const router = express.Router();

// GET all kits for current user
router.get('/', authMiddleware, async (req, res) => {
  try {
    const kits = await Kit.find({ user_id: req.user.id }).sort({ createdAt: -1 });
    res.json({ kits });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// GET a specific kit (must belong to user)
router.get('/:id', authMiddleware, async (req, res) => {
  try {
    const kit = await Kit.findOne({ _id: req.params.id, user_id: req.user.id });
    if (!kit) return res.status(404).json({ message: 'Kit not found or unauthorized' });
    res.json({ kit });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// POST save a new kit
router.post('/', authMiddleware, async (req, res) => {
  try {
    const kitData = { ...req.body.kit, user_id: req.user.id };
    // Mongoose handles validation against KitSchema
    const kit = new Kit(kitData);
    await kit.save();
    res.status(201).json({ kit });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// PUT update an existing kit
router.put('/:id', authMiddleware, async (req, res) => {
  try {
    const kit = await Kit.findOneAndUpdate(
      { _id: req.params.id, user_id: req.user.id },
      { $set: req.body.kit },
      { new: true, runValidators: true }
    );
    if (!kit) return res.status(404).json({ message: 'Kit not found or unauthorized' });
    res.json({ kit });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// DELETE a kit
router.delete('/:id', authMiddleware, async (req, res) => {
  try {
    const kit = await Kit.findOneAndDelete({ _id: req.params.id, user_id: req.user.id });
    if (!kit) return res.status(404).json({ message: 'Kit not found or unauthorized' });
    res.json({ message: 'Kit deleted' });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

module.exports = router;
