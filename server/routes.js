/**
 * routes.js
 * Xendit Checkout Demo
 * This file defines all the endpoints for this demo (on the api/backend side).
 */

'use strict';

const express = require('express');
const router = express.Router();
const axios = require('axios'); // Untuk request ke Xendit API
require('dotenv').config(); // Pastikan file .env terbaca

// Log untuk memeriksa apakah API_GATEWAY_URL terbaca dengan benar
console.log('API_GATEWAY_URL:', process.env.API_GATEWAY_URL);
console.log('API_KEY:', process.env.API_KEY);

// load the controller
const InvoiceController = require('./controller');
const invoiceController = new InvoiceController();

// load the configuration file
const config = require('./config');

/**
 * Xendit integration to create invoice
 * 1. GET /api/healthcheck/readiness to make sure the server is up and running
 * 2. POST /api/invoice to create invoice (proxy from this backend to Xendit API Gateway)
 */

router.get('/api/healthcheck/readiness', (req, res) => {
    res.json({
        status: 'ok'
    });
});

router.post('/api/invoice', async (req, res) => {
    try {
        // Log untuk memeriksa data yang dikirimkan
        console.log('Request body:', req.body);

        // you can change the config with your business details
        const data = {
            ...config.invoiceData,
            external_id: `checkout-demo-${+new Date()}`,
            currency: req.body.currency,
            amount: req.body.amount,
            failure_redirect_url: req.body.redirect_url,
            success_redirect_url: req.body.redirect_url,
            callback_url: 'https://c3ac-114-10-42-200.ngrok-free.app/xendit-callback'
        };

        // Mengirim request ke Xendit API
        const invoice = await axios.post(
            `${process.env.API_GATEWAY_URL}/v2/invoices`,
            data,
            {
                headers: {
                    Authorization: `Basic ${Buffer.from(
                        process.env.API_KEY + ':'
                    ).toString('base64')}`,
                    'Content-Type': 'application/json'
                }
            }
        );

        // Log response dari Xendit API
        console.log('Invoice created:', invoice.data);

        return res.status(200).send(invoice.data);
    } catch (e) {
        // Log detail error jika ada masalah
        console.error('Error occurred while creating invoice:', e);

        if (e.response) {
            console.error('Xendit API response error:', e.response.data);
            return res.status(e.response.status).send(e.response.data);
        } else {
            return res.status(500).json({
                message: 'Internal Server Error',
                error: e.message || e
            });
        }
    }
});

/**
 * Route untuk menerima callback dari Xendit
 * Xendit akan mengirimkan data transaksi setelah pembayaran berhasil atau gagal.
 */
router.post('/xendit-callback', (req, res) => {
    // Log seluruh body dari callback Xendit
    console.log('Received callback from Xendit:', req.body);

    // Logika pemrosesan callback, misalnya ketika pembayaran berhasil
    if (req.body.status === 'PAID') {
        console.log(`Payment successful for invoice: ${req.body.external_id}`);
    } else if (req.body.status === 'FAILED') {
        console.log(`Payment failed for invoice: ${req.body.external_id}`);
    }

    // Selalu kirim respons 200 untuk menandakan callback diterima
    res.status(200).send('Callback received');
});


module.exports = router;
