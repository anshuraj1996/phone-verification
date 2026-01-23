# Phone Verification API

A comprehensive Node.js backend API for phone number verification using SMS with Twilio integration, JWT authentication, and MongoDB for data persistence.

##  Features

- **Phone Verification**: SMS-based OTP verification using Twilio
- **JWT Authentication**: Secure token-based authentication system
- **MongoDB Integration**: Persistent user data storage
- **Rate Limiting**: Built-in protection against spam requests
- **Input Validation**: Comprehensive request validation and sanitization
- **Security**: Helmet.js security headers and CORS protection
- **AWS Lambda Ready**: Serverless deployment configuration included
- **Production Ready**: Environment-based configuration and error handling

##  Prerequisites

- Node.js (v14 or higher)
- MongoDB Atlas account or local MongoDB instance
- Twilio account with SMS capability
- Git (for version control)

##  Installation

1. **Clone the repository**
   ```bash
   git clone <your-repository-url>
   cd phone-verification-api
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Environment Setup**
   ```bash
   cp .env.example .env
   ```
   
   Update the `.env` file with your credentials:
   ```env
   # Database
   MONGODB_URI=your_mongodb_connection_string
   
   # JWT
   JWT_SECRET=your_jwt_secret_key
   
   # Twilio
   TWILIO_ACCOUNT_SID=your_twilio_account_sid
   TWILIO_AUTH_TOKEN=your_twilio_auth_token
   TWILIO_PHONE_NUMBER=your_twilio_phone_number
   ```

##  Quick Start

### Development Mode
```bash
npm run dev
```

### Production Mode
```bash
npm start
```

The API will be available at `http://localhost:3000`

##  API Documentation

### Base URL
```
http://localhost:3000/api/auth
```

### Endpoints

#### 1. Health Check
```http
GET /api/auth/health
```

#### 2. Request Phone Verification
```http
POST /api/auth/verify-phone/request
Content-Type: application/json

{
  "phoneNumber": "+1234567890"
}
```

#### 3. Confirm Phone Verification
```http
POST /api/auth/verify-phone/confirm
Content-Type: application/json

{
  "phoneNumber": "+1234567890",
  "verificationCode": "123456"
}
```

#### 4. User Registration
```http
POST /api/auth/register
Content-Type: application/json

{
  "phoneNumber": "+1234567890",
  "password": "SecurePassword123"
}
```

#### 5. User Login
```http
POST /api/auth/login
Content-Type: application/json

{
  "phoneNumber": "+1234567890",
  "password": "SecurePassword123"
}
```

#### 6. Get User Profile (Protected)
```http
GET /api/auth/profile
Authorization: Bearer <your_jwt_token>
```

#### 7. Dashboard (Protected, Phone Verified Users Only)
```http
GET /api/auth/dashboard
Authorization: Bearer <your_jwt_token>
```

##  Project Structure

```
phone-verification-api/
├── src/
│   ├── config/
│   │   └── database.js          # MongoDB connection
│   ├── controllers/
│   │   └── authController.js    # Authentication logic
│   ├── middleware/
│   │   └── auth.js             # JWT middleware
│   ├── models/
│   │   └── User.js             # User schema
│   ├── routes/
│   │   └── authRoutes.js       # API routes
│   ├── services/
│   │   └── smsService.js       # Twilio SMS service
│   ├── utils/
│   │   └── validation.js       # Validation utilities
│   ├── lambda.js               # AWS Lambda handler
│   └── server.js               # Express server
├── public/
│   └── index.html              # Frontend demo
├── .env.example                # Environment template
├── .gitignore                  # Git ignore rules
├── package.json                # Dependencies
├── serverless.yml              # Serverless config
└── README.md                   # Documentation
```

##  Security Features

- **Helmet.js**: Security headers
- **CORS**: Cross-origin resource sharing protection
- **Rate Limiting**: Request throttling
- **Input Validation**: Request sanitization
- **JWT**: Secure token authentication
- **Password Hashing**: bcrypt encryption
- **Environment Variables**: Secure credential storage

##  Frontend Demo

Access the demo frontend at `http://localhost:3000` to test the phone verification flow.

##  AWS Deployment

### Lambda + API Gateway
```bash
npm run deploy
```

### Environment Variables for Production
Set these in AWS Lambda environment:
- `NODE_ENV=production`
- `MONGODB_URI=your_production_mongodb_uri`
- `JWT_SECRET=your_production_jwt_secret`
- `TWILIO_ACCOUNT_SID=your_twilio_sid`
- `TWILIO_AUTH_TOKEN=your_twilio_token`
- `TWILIO_PHONE_NUMBER=your_twilio_number`

##  Testing

The API includes comprehensive validation and error handling. Test endpoints using:
- Postman
- cURL commands
- Frontend demo interface

##  Configuration

### Rate Limiting
- Default: 5 requests per 15 minutes per IP
- Configurable via environment variables

### JWT Tokens
- Default expiry: 7 days
- Configurable via `JWT_EXPIRES_IN`

### SMS Verification
- Code length: 6 digits
- Code expiry: 2 minutes
- Configurable via environment variables

##  Contributing

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

##  License

This project is licensed under the MIT License - see the LICENSE file for details.

##  Support

For support, email anshumansingh355@gmail.com or create an issue in the GitHub repository.

## 🙏 Acknowledgments

- Twilio for SMS service
- MongoDB for database solutions
- Express.js community
- All contributors

---

**Built  by Anshumans Singh**
