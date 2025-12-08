# Catalog Scanner Feature Guide

## Overview

The Catalog Scanner is an intelligent feature that analyzes your shop's product catalog and automatically creates product types and products in the Tajir POS system. This feature helps you quickly set up your product database by scanning existing catalog data and suggesting optimal product organization.

## Features

### 🔍 **Smart Analysis**
- Analyzes product names, categories, and pricing patterns
- Identifies common product types and categories
- Suggests optimal product organization
- Provides pricing insights and recommendations

### 📊 **Data Processing**
- Supports CSV file uploads
- Manual data entry option
- Automatic data cleaning and validation
- Flexible field mapping (name, price, category, description)

### 🎯 **Intelligent Suggestions**
- Automatically creates product types based on categories
- Suggests products with appropriate pricing
- Provides recommendations for bulk pricing
- Identifies common patterns in product names

## How to Use

### Step 1: Access the Feature
1. Navigate to the **Products** section in your Tajir POS dashboard
2. Click the **"Scan Catalog"** button (green button with checkmark icon)

### Step 2: Upload Your Catalog Data

#### Option A: Upload CSV File
1. Click **"Choose File"** to select your CSV file
2. Ensure your CSV has the following columns:
   - `name` - Product name
   - `price` - Product price (numeric)
   - `category` - Product category/type
   - `description` - Product description (optional)

#### Option B: Manual Data Entry
1. Click **"Enter Data Manually"**
2. Paste your catalog data in JSON format
3. Click **"Process Data"**

#### Option C: Use Sample Template
1. Download the **Sample CSV Template** from the modal
2. Fill in your product data following the template format
3. Upload the completed file

### Step 3: Review Analysis Results
The system will show you:
- **Summary**: Total items, categories found, price ranges
- **Categories**: Breakdown of products by category with average pricing
- **Price Distribution**: How your products are distributed across price ranges
- **Common Patterns**: Keywords and patterns found in product names

### Step 4: Review Product Suggestions
The system will suggest:
- **Product Types**: Automatically created categories based on your data
- **Products**: Individual products with pricing and descriptions
- **Recommendations**: Suggestions for bulk pricing and organization

### Step 5: Create Products
1. Review all suggestions carefully
2. Click **"Create Products"** to automatically add them to your system
3. The system will create product types and products in your database

## Sample Data Format

### CSV Format
```csv
name,price,category,description
Linen Shirt,120.00,Shirts,High-quality linen shirt with modern fit
Cotton T-Shirt,45.00,Shirts,Comfortable cotton t-shirt
Wool Blazer,350.00,Coats,Professional wool blazer for formal occasions
```

### JSON Format
```json
[
  {
    "name": "Linen Shirt",
    "price": 120.00,
    "category": "Shirts",
    "description": "High-quality linen shirt with modern fit"
  },
  {
    "name": "Cotton T-Shirt",
    "price": 45.00,
    "category": "Shirts",
    "description": "Comfortable cotton t-shirt"
  }
]
```

## Supported File Types

- **CSV files** (.csv) - Most common and recommended
- **Excel files** (.xlsx, .xls) - Basic support
- **JSON data** - For manual entry

## Field Mapping

The system automatically maps common field names:

| Your Field Name | System Field | Description |
|----------------|--------------|-------------|
| `name`, `product_name`, `title` | Product Name | Required |
| `price`, `rate`, `cost` | Price | Required, numeric |
| `category`, `type`, `product_type` | Category | Used for product types |
| `description`, `desc` | Description | Optional |

## Analysis Features

### Category Analysis
- Groups products by category
- Calculates average, minimum, and maximum prices per category
- Suggests product types based on category patterns

### Price Range Analysis
- Categorizes products into price ranges:
  - Budget (≤10 AED)
  - Standard (11-25 AED)
  - Premium (26-50 AED)
  - High-end (51-100 AED)
  - Luxury (>100 AED)

### Pattern Recognition
- Identifies common keywords in product names
- Recognizes size patterns (XS, S, M, L, XL, XXL)
- Detects material types (cotton, silk, wool, linen, etc.)

## Best Practices

### 1. **Prepare Your Data**
- Ensure product names are clear and descriptive
- Use consistent category names
- Include accurate pricing information
- Add descriptions for better organization

### 2. **Review Suggestions**
- Always review the analysis before creating products
- Check that categories make sense for your business
- Verify pricing suggestions are appropriate
- Consider the recommendations for bulk pricing

### 3. **Data Quality**
- Remove duplicate entries before uploading
- Ensure all required fields are filled
- Use consistent formatting for prices
- Clean up any special characters that might cause issues

### 4. **After Creation**
- Review the created products in your Products section
- Make any necessary adjustments to pricing or descriptions
- Consider adding additional product types if needed
- Test the products in the billing system

## Troubleshooting

### Common Issues

**"No valid catalog data found"**
- Check that your CSV has the required columns
- Ensure product names and prices are not empty
- Verify the file format is correct

**"Analysis failed"**
- Check your internet connection
- Ensure the file size is reasonable (< 10MB)
- Try uploading a smaller sample first

**"Invalid JSON format"**
- Use a JSON validator to check your data
- Ensure all brackets and quotes are properly closed
- Check that all required fields are present

### Getting Help

If you encounter issues:
1. Try using the sample CSV template as a reference
2. Check that your data follows the required format
3. Start with a small sample of products to test
4. Contact support if problems persist

## API Endpoints

For developers, the catalog scanner uses these API endpoints:

- `POST /api/catalog/scan` - Analyze catalog data
- `POST /api/catalog/auto-create` - Create products from suggestions

## Security Notes

- All data is processed securely on the server
- No catalog data is stored permanently
- Analysis is performed in real-time
- Only validated and cleaned data is used for product creation

---

**Note**: The Catalog Scanner is designed to help you quickly set up your product database. Always review the suggestions before creating products to ensure they match your business requirements.
