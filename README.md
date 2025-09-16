# CRM Frontend - Business Suite

A modern, AI-powered Customer Relationship Management (CRM) platform built with React, TypeScript, and Tailwind CSS. This frontend application provides a comprehensive suite of business tools for managing customers, campaigns, orders, and analytics.

## 🚀 Live Demo

- **Frontend**: [https://crm-frontend-xqgx.onrender.com](https://crm-frontend-xqgx.onrender.com)
- **Backend API**: [https://crm-backend-yn3q.onrender.com](https://crm-backend-yn3q.onrender.com)

## 🔗 Backend Implementation

This frontend application is powered by a comprehensive Node.js backend system. For the complete backend implementation, API documentation, and deployment instructions, please refer to:

**Backend Repository**: [https://github.com/Rakesh-Kumar-Talam/CRM-backend](https://github.com/Rakesh-Kumar-Talam/CRM-backend)

### Backend Features
- **Node.js & TypeScript** - Robust server-side implementation
- **MongoDB Atlas** - Scalable database with Mongoose ODM
- **Google OAuth 2.0** - Secure authentication system
- **AI Integration** - Google Gemini AI for natural language processing
- **Queue Processing** - BullMQ with Redis for background tasks
- **Email Delivery** - Gmail API integration with SMTP fallback
- **Comprehensive API** - RESTful endpoints with Swagger documentation

## 🏗️ Full-Stack Architecture

This CRM system consists of two main components:

### Frontend (This Repository)
- **React 18** with TypeScript
- **Tailwind CSS** for styling
- **Client-side routing** with React Router
- **State management** with React Context
- **API integration** with Axios

### Backend ([CRM-backend](https://github.com/Rakesh-Kumar-Talam/CRM-backend))
- **Node.js** with Express.js framework
- **MongoDB Atlas** for data persistence
- **Google OAuth 2.0** for authentication
- **AI-powered features** with Google Gemini
- **Queue-based processing** with BullMQ and Redis
- **Email delivery** via Gmail API

### Data Flow
```
Frontend (React) → API Calls → Backend (Node.js) → Database (MongoDB)
                ← JSON Response ← Business Logic ← Data Processing
```

### API Integration
The frontend communicates with the backend through RESTful APIs:

#### Authentication Endpoints
- `GET /api/auth/google` - Initiate Google OAuth
- `GET /api/auth/google/callback` - OAuth callback handler
- `POST /api/auth/verify` - Token verification

#### Core API Endpoints
- `GET /api/customers` - Customer management
- `GET /api/orders` - Order processing
- `GET /api/campaigns` - Campaign management
- `GET /api/segments` - Customer segmentation
- `GET /api/messages` - Messaging system

For complete API documentation, visit the [Backend Repository](https://github.com/Rakesh-Kumar-Talam/CRM-backend).

## ✨ Features

### 🔐 Authentication & Security
- **Google OAuth 2.0** integration for secure authentication
- **JWT-based** session management
- **Protected routes** with automatic redirects
- **Secure token handling** with localStorage

### 📊 Dashboard & Analytics
- **Real-time statistics** and KPIs
- **Interactive charts** and data visualizations
- **Revenue tracking** with 30-day trends
- **Customer growth** analytics
- **Database connection** status monitoring
- **Recent activity** feeds

### 👥 Customer Management
- **Complete customer profiles** with contact information
- **Customer segmentation** and categorization
- **Spend calculation** and analytics
- **Order history** tracking
- **Advanced search** and filtering
- **Bulk operations** support

### 🛒 Order Management
- **Order creation** and tracking
- **Order status** management
- **Revenue calculation** and reporting
- **Customer order** history
- **Order analytics** and insights

### 🎯 Campaign Management
- **AI-powered campaign** creation
- **Email campaign** management
- **Campaign performance** tracking
- **A/B testing** capabilities
- **Success rate** analytics
- **Segment-based** targeting

### 📧 Messaging & Communication
- **Email integration** with Gmail
- **Bulk messaging** capabilities
- **Message templates** and personalization
- **Delivery tracking** and receipts
- **Message analytics** and statistics
- **AI-generated** personalized messages

### 🎨 User Interface
- **Modern, responsive** design
- **Dark/Light theme** support
- **Mobile-first** approach
- **Accessible** components
- **Smooth animations** and transitions
- **Intuitive navigation**

## 🛠️ Tech Stack

### Frontend
- **React 18** - UI library
- **TypeScript** - Type safety
- **Tailwind CSS** - Styling
- **React Router DOM** - Routing
- **React Hook Form** - Form management
- **Axios** - HTTP client
- **Recharts** - Data visualization
- **Lucide React** - Icons
- **React Hot Toast** - Notifications

### Backend Integration
- **RESTful API** communication
- **JWT authentication**
- **Google OAuth 2.0**
- **Session management**
- **Error handling**

## 📁 Project Structure

```
src/
├── components/
│   └── Layout/
│       └── Layout.tsx          # Main layout component
├── contexts/
│   └── AuthContext.tsx         # Authentication context
├── pages/
│   ├── Dashboard.tsx           # Main dashboard
│   ├── Customers.tsx           # Customer management
│   ├── Orders.tsx              # Order management
│   ├── Campaigns.tsx           # Campaign management
│   ├── Messaging.tsx           # Messaging system
│   ├── Segments.tsx            # Customer segmentation
│   └── Login.tsx               # Authentication page
├── services/
│   ├── api.ts                  # API service layer
│   └── customerSpendCalculation.ts
├── types/
│   └── index.ts                # TypeScript type definitions
├── auth/
│   ├── routes.ts               # Authentication routes
│   └── passport.ts             # Passport configuration
├── App.tsx                     # Main application component
└── index.tsx                   # Application entry point
```

## 🚀 Getting Started

### Prerequisites
- **Node.js** (v16 or higher)
- **npm** or **yarn**
- **Backend API** running (see [Backend Repository](https://github.com/Rakesh-Kumar-Talam/CRM-backend))

### Backend Requirements
Before running the frontend, ensure the backend is properly configured:

1. **MongoDB Atlas** - Database connection
2. **Google Cloud Console** - OAuth and Gmail API setup
3. **Redis Server** - For queue processing (optional)
4. **Environment Variables** - Backend configuration

For detailed backend setup instructions, visit: [CRM-backend Setup Guide](https://github.com/Rakesh-Kumar-Talam/CRM-backend#-local-setup-instructions)

### Installation

1. **Clone the repository**
   ```bash
   git clone <repository-url>
   cd crm-frontend
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Environment Setup**
   ```bash
   cp env.example .env.local
   ```
   
   Update `.env.local` with your configuration:
   ```env
   REACT_APP_API_URL=https://crm-backend-yn3q.onrender.com/api
   REACT_APP_FRONTEND_URL=https://crm-frontend-xqgx.onrender.com
   REACT_APP_BASENAME=
   ```

4. **Start development server**
   ```bash
   npm start
   ```

5. **Open your browser**
   Navigate to `http://localhost:3000`

### Production Build

```bash
npm run build
```

The build artifacts will be stored in the `build/` directory.

## 🔧 Configuration

### Environment Variables

| Variable | Description | Default |
|----------|-------------|---------|
| `REACT_APP_API_URL` | Backend API URL | `https://crm-backend-yn3q.onrender.com/api` |
| `REACT_APP_FRONTEND_URL` | Frontend URL for OAuth redirects | `https://crm-frontend-xqgx.onrender.com` |
| `REACT_APP_BASENAME` | Router basename | `` (empty) |

### Backend Configuration

Ensure your backend has the following environment variables:
- `FRONTEND_URL` - Frontend URL for OAuth redirects
- `GOOGLE_CLIENT_ID` - Google OAuth client ID
- `GOOGLE_CLIENT_SECRET` - Google OAuth client secret
- `JWT_SECRET` - JWT signing secret

## 📱 Features Overview

### Dashboard
- **Statistics Cards**: Total customers, orders, campaigns, revenue
- **Charts**: Revenue trends, customer growth, conversion rates
- **Recent Activity**: Latest customers, orders, campaigns, messages
- **Database Status**: Real-time connection monitoring

### Customer Management
- **Customer List**: Paginated table with search and filters
- **Customer Details**: Complete profile information
- **Order History**: Associated orders and transactions
- **Spend Analytics**: Customer lifetime value calculation
- **Segmentation**: Assign customers to segments

### Order Management
- **Order Creation**: Add new orders with customer association
- **Order Tracking**: Monitor order status and progress
- **Revenue Analytics**: Track sales performance
- **Customer Orders**: View all orders for a specific customer

### Campaign Management
- **Campaign Creation**: AI-powered campaign setup
- **Email Campaigns**: Send targeted email campaigns
- **Performance Tracking**: Monitor campaign success rates
- **Segment Targeting**: Target specific customer segments
- **A/B Testing**: Test different campaign variations

### Messaging System
- **Email Integration**: Connect with Gmail for sending
- **Message Templates**: Create reusable message templates
- **Bulk Messaging**: Send messages to multiple customers
- **Delivery Tracking**: Monitor message delivery status
- **Analytics**: Track message performance and engagement

## 🔐 Authentication Flow

1. **User clicks "Continue with Google"**
2. **Redirected to Google OAuth**
3. **Google authentication completed**
4. **Backend processes OAuth callback**
5. **Redirected to `/dashboard?token=...`**
6. **Frontend processes token and user data**
7. **User authenticated and redirected to main dashboard**

## 🎨 UI Components

### Design System
- **Color Palette**: Modern gradient-based design
- **Typography**: Clean, readable fonts
- **Spacing**: Consistent spacing system
- **Icons**: Lucide React icon library
- **Animations**: Smooth transitions and hover effects

### Responsive Design
- **Mobile-first** approach
- **Breakpoints**: sm, md, lg, xl
- **Flexible layouts** that adapt to screen size
- **Touch-friendly** interface elements

## 🧪 Testing

```bash
# Run tests
npm test

# Run tests with coverage
npm test -- --coverage
```

## 📦 Deployment

### Render Deployment
1. **Connect your repository** to Render
2. **Set environment variables** in Render dashboard
3. **Deploy** automatically on push to main branch

### Manual Deployment
1. **Build the project**: `npm run build`
2. **Upload build folder** to your hosting service
3. **Configure environment variables**
4. **Set up routing** for single-page application

## 🤝 Contributing

1. **Fork the repository**
2. **Create a feature branch**: `git checkout -b feature/amazing-feature`
3. **Commit changes**: `git commit -m 'Add amazing feature'`
4. **Push to branch**: `git push origin feature/amazing-feature`
5. **Open a Pull Request**

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 🆘 Support

For support and questions:
- **Create an issue** in the repository
- **Check the documentation** for common solutions
- **Review the API documentation** for backend integration

## 🔄 Version History

- **v0.1.0** - Initial release with core CRM features
- **v0.1.1** - Added OAuth authentication
- **v0.1.2** - Enhanced dashboard analytics
- **v0.1.3** - Improved mobile responsiveness

## 🎯 Roadmap

- [ ] **Advanced Analytics** - More detailed reporting
- [ ] **Mobile App** - React Native version
- [ ] **Real-time Notifications** - WebSocket integration
- [ ] **Advanced Segmentation** - AI-powered customer grouping
- [ ] **Integration APIs** - Third-party service connections
- [ ] **Multi-language Support** - Internationalization
- [ ] **Advanced Permissions** - Role-based access control

---

**Built with ❤️ using React, TypeScript, and Tailwind CSS**

