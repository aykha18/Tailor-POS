# 📧 Email Integration - Tajir POS

## Overview
The Email Integration feature allows users to send professional invoice emails directly from the Tajir POS system. This feature is available for Basic and Pro plan users.

## Features

### ✅ **Professional Email Templates**
- **English & Arabic Support**: Send invoices in both languages
- **Responsive Design**: Beautiful HTML templates that work on all devices
- **Branded Invoices**: Includes shop name, logo, and contact information
- **Complete Invoice Details**: All bill items, totals, VAT, and customer information

### ✅ **Easy-to-Use Interface**
- **One-Click Email**: Send invoices directly from the billing interface
- **Email Validation**: Real-time email format validation
- **Language Selection**: Choose between English and Arabic templates
- **Status Feedback**: Clear success/error messages

### ✅ **Smart Integration**
- **Plan-Based Access**: Available for Basic and Pro plan users
- **Auto-Save**: Automatically saves bills before sending email
- **Customer Auto-Fill**: Pre-fills customer email if available
- **Professional Subject Lines**: Clear, branded email subjects

## Setup Instructions

### 1. **Environment Variables**
Add these environment variables to your `.env` file:

```env
# Email Configuration
SMTP_SERVER=smtp.gmail.com
SMTP_PORT=587
SMTP_USERNAME=your-email@gmail.com
SMTP_PASSWORD=your-app-password
FROM_EMAIL=your-email@gmail.com
FROM_NAME=Tajir POS
```

### 2. **Gmail Setup (Recommended)**
1. Enable 2-Factor Authentication on your Gmail account
2. Generate an App Password:
   - Go to Google Account Settings
   - Security → 2-Step Verification → App Passwords
   - Generate a password for "Mail"
3. Use the generated password as `SMTP_PASSWORD`

### 3. **Other Email Providers**
- **Outlook/Hotmail**: Use `smtp-mail.outlook.com:587`
- **Yahoo**: Use `smtp.mail.yahoo.com:587`
- **Custom SMTP**: Use your provider's SMTP settings

## Usage

### **Sending an Invoice via Email**

1. **Create a Bill**: Add items to your bill in the billing section
2. **Click "Send Email"**: The green email button next to the print button
3. **Enter Recipient Email**: Type the customer's email address
4. **Select Language**: Choose English or Arabic
5. **Review Details**: Check the invoice summary in the modal
6. **Send**: Click "Send Email" to deliver the invoice

### **Email Template Features**

#### **English Template**
- Professional header with shop branding
- Customer details section
- Complete itemized invoice table
- Subtotal, VAT, and total calculations
- Shop contact information footer

#### **Arabic Template (RTL)**
- Right-to-left layout for Arabic text
- Arabic translations for all labels
- Localized currency display (درهم)
- Arabic-friendly typography

## API Endpoints

### **Send Invoice Email**
```http
POST /api/bills/{bill_id}/send-email
Content-Type: application/json

{
  "email": "customer@example.com",
  "language": "en"
}
```

### **Test Email Configuration**
```http
POST /api/email/test
Content-Type: application/json

{
  "email": "test@example.com"
}
```

### **Get Email Configuration**
```http
GET /api/email/config
```

## Error Handling

### **Common Issues & Solutions**

#### **"Email integration not available"**
- **Solution**: Upgrade to Basic or Pro plan
- **Check**: Verify your current plan status

#### **"Invalid email address format"**
- **Solution**: Enter a valid email address (e.g., `customer@example.com`)
- **Check**: Ensure proper email format with @ and domain

#### **"Authentication failed"**
- **Solution**: Check SMTP credentials in environment variables
- **Check**: Verify username/password are correct

#### **"Connection timeout"**
- **Solution**: Check internet connection and SMTP server settings
- **Check**: Verify SMTP server and port are correct

## Security Features

### **Email Validation**
- Real-time email format validation
- Server-side email address verification
- Protection against email injection attacks

### **Plan-Based Access**
- Feature restricted to Basic and Pro plans
- Automatic access control based on subscription
- Graceful degradation for trial users

### **Secure Configuration**
- Environment variable-based configuration
- No hardcoded credentials in code
- Secure SMTP authentication

## Troubleshooting

### **Email Not Sending**
1. Check environment variables are set correctly
2. Verify SMTP server and port settings
3. Test with `/api/email/test` endpoint
4. Check server logs for detailed error messages

### **Template Issues**
1. Ensure shop settings are configured
2. Check customer data is complete
3. Verify bill items are properly formatted

### **Performance Issues**
1. Email sending is asynchronous
2. Large invoices may take longer to process
3. Check server resources and network connectivity

## Future Enhancements

### **Planned Features**
- **Email Templates**: Customizable email templates
- **Bulk Email**: Send multiple invoices at once
- **Email Tracking**: Track email delivery and opens
- **Scheduled Emails**: Send invoices at specific times
- **Email History**: View sent email history

### **Advanced Features**
- **PDF Attachments**: Attach PDF invoices to emails
- **Email Signatures**: Custom email signatures
- **Auto-Reply**: Automatic confirmation emails
- **Email Analytics**: Track email performance

## Support

For technical support with email integration:
1. Check the troubleshooting section above
2. Verify your plan includes email features
3. Test email configuration using the test endpoint
4. Contact support with specific error messages

---

**Note**: Email integration requires proper SMTP configuration and is only available for Basic and Pro plan users. 