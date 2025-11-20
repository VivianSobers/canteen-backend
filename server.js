const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const bcrypt = require('bcryptjs');
const app = express();
app.use(cors());
app.use(express.json());
mongoose.connect('mongodb://localhost:27017/canteen', {
  useNewUrlParser: true,
  useUnifiedTopology: true,
})
.then(() => console.log('Connected to MongoDB'))
.catch((err) => console.error('MongoDB connection error:', err));
const userSchema = new mongoose.Schema({
  name: { type: String, required: true },
  srn: { type: String, required: true, unique: true },
  password: { type: String, required: true },
  createdAt: { type: Date, default: Date.now }
});
const User = mongoose.model('User', userSchema);
const orderSchema = new mongoose.Schema({
  userName: { type: String, required: true },
  srn: { type: String, required: true },
  orderNumber: { type: String, required: true, unique: true },
  otp: { type: String, required: true },
  items: { type: Array, required: true },
  totalAmount: { type: Number, required: true },
  received: { type: Boolean, default: false },
  createdAt: { type: Date, default: Date.now }
});
const Order = mongoose.model('Order', orderSchema);
app.post('/api/check-srn', async (req, res) => {
  try {
    const { srn } = req.body;
    const user = await User.findOne({ srn });
    
    if (user) {
      return res.json({ exists: true, message: 'SRN already registered. Please login.' });
    }
    
    res.json({ exists: false, message: 'SRN available for signup.' });
  } catch (error) {
    res.status(500).json({ error: 'Server error', details: error.message });
  }
});
app.post('/api/signup', async (req, res) => {
  try {
    const { name, srn, password } = req.body;
    const existingUser = await User.findOne({ srn });
    if (existingUser) {
      return res.status(400).json({ 
        error: 'SRN already exists', 
        message: 'This SRN is already registered. Please login instead.' 
      });
    }
    const hashedPassword = await bcrypt.hash(password, 10);
    const newUser = new User({
      name,
      srn,
      password: hashedPassword
    });

    await newUser.save();

    res.status(201).json({ 
      success: true, 
      message: 'Signup successful! Please login.',
      user: { name, srn }
    });
  } catch (error) {
    res.status(500).json({ error: 'Signup failed', details: error.message });
  }
});
app.post('/api/login', async (req, res) => {
  try {
    const { srn, password } = req.body;
    const user = await User.findOne({ srn });
    if (!user) {
      return res.status(400).json({ 
        error: 'User not found', 
        message: 'No account found with this SRN. Please signup first.' 
      });
    }
    const isPasswordValid = await bcrypt.compare(password, user.password);
    if (!isPasswordValid) {
      return res.status(400).json({ 
        error: 'Invalid password', 
        message: 'Incorrect password. Please try again.' 
      });
    }

    res.json({ 
      success: true, 
      message: 'Login successful!',
      user: { 
        name: user.name, 
        srn: user.srn 
      }
    });
  } catch (error) {
    res.status(500).json({ error: 'Login failed', details: error.message });
  }
});
app.post('/api/orders', async (req, res) => {
  try {
    const { userName, srn, orderNumber, otp, items, totalAmount } = req.body;
    const user = await User.findOne({ srn });
    if (!user) {
      return res.status(400).json({ error: 'User not found' });
    }
    const newOrder = new Order({
      userName,
      srn,
      orderNumber,
      otp,
      items,
      totalAmount,
      received: false
    });
    await newOrder.save();

    res.status(201).json({ 
      success: true, 
      message: 'Order placed successfully!',
      order: newOrder
    });
  } catch (error) {
    res.status(500).json({ error: 'Order creation failed', details: error.message });
  }
});
app.get('/api/orders/:orderNumber', async (req, res) => {
  try {
    const { orderNumber } = req.params;
    const order = await Order.findOne({ orderNumber });
    
    if (!order) {
      return res.status(404).json({ error: 'Order not found' });
    }
    
    res.json({ success: true, order });
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch order', details: error.message });
  }
});
app.get('/api/orders/user/:srn', async (req, res) => {
  try {
    const { srn } = req.params;
    const orders = await Order.find({ srn }).sort({ createdAt: -1 });
    
    res.json({ success: true, orders });
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch orders', details: error.message });
  }
});
app.patch('/api/orders/:orderNumber/received', async (req, res) => {
  try {
    const { orderNumber } = req.params;
    const { received } = req.body;

    const order = await Order.findOneAndUpdate(
      { orderNumber },
      { received },
      { new: true }
    );

    if (!order) {
      return res.status(404).json({ error: 'Order not found' });
    }

    res.json({ 
      success: true, 
      message: 'Order status updated',
      order 
    });
  } catch (error) {
    res.status(500).json({ error: 'Failed to update order', details: error.message });
  }
});
const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`🚀 Server running on http://localhost:${PORT}`);
});