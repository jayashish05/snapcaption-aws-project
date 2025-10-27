const express = require('express');
const { createUser, validateUser } = require('../services/userService');
const { redirectIfAuth } = require('../middleware/authMiddleware');

const router = express.Router();

/**
 * GET /signup - Show signup page
 */
router.get('/signup', redirectIfAuth, (req, res) => {
  res.render('signup', { error: null });
});

/**
 * POST /signup - Create new user
 */
router.post('/signup', redirectIfAuth, async (req, res) => {
  try {
    const { name, email, password, confirmPassword } = req.body;

    // Validate input
    if (!name || !email || !password || !confirmPassword) {
      return res.render('signup', { error: 'All fields are required' });
    }

    if (password !== confirmPassword) {
      return res.render('signup', { error: 'Passwords do not match' });
    }

    if (password.length < 6) {
      return res.render('signup', { error: 'Password must be at least 6 characters' });
    }

    // Create user
    const user = await createUser(email, password, name);

    // Set session
    req.session.user = user;

    // Redirect to home
    res.redirect('/');
  } catch (error) {
    console.error('Signup error:', error);
    res.render('signup', { 
      error: error.message || 'Failed to create account. Please try again.' 
    });
  }
});

/**
 * GET /signin - Show signin page
 */
router.get('/signin', redirectIfAuth, (req, res) => {
  res.render('signin', { error: null });
});

/**
 * POST /signin - Authenticate user
 */
router.post('/signin', redirectIfAuth, async (req, res) => {
  try {
    const { email, password } = req.body;

    // Validate input
    if (!email || !password) {
      return res.render('signin', { error: 'Email and password are required' });
    }

    // Validate credentials
    const user = await validateUser(email, password);

    if (!user) {
      return res.render('signin', { error: 'Invalid email or password' });
    }

    // Set session
    req.session.user = user;

    // Redirect to home
    res.redirect('/');
  } catch (error) {
    console.error('Signin error:', error);
    res.render('signin', { error: 'Failed to sign in. Please try again.' });
  }
});

/**
 * GET /signout - Log out user
 */
router.get('/signout', (req, res) => {
  req.session.destroy((err) => {
    if (err) {
      console.error('Error destroying session:', err);
    }
    res.redirect('/signin');
  });
});

module.exports = router;
