# Manual Recording Guide for Tajir POS Demo

## 🎬 Recording with Chrome Extensions

### Prerequisites:
- Chrome browser with your recording extension installed
- Flask app running on `http://localhost:5000`

### Step-by-Step Recording Process:

#### 1. Start the Application
```bash
python app.py
```
Wait for the message: "Running on http://127.0.0.1:5000"

#### 2. Open Chrome with Your Recording Extension
- Open your Chrome browser (with recording extension)
- Start your recording extension
- Navigate to: `http://localhost:5000/login`

#### 3. Manual Demo Steps (Follow the Script)

**Step 1: Login**
- Email: `demo@tajir.com`
- Password: `aykha123`
- Click "Sign In"

**Step 2: Dashboard**
- Click "Dashboard" in sidebar
- Show charts and metrics (wait 3 seconds)

**Step 3: Product Management**
- Click "Products" in sidebar
- Fill the form:
  - Product Name: `Moroccon Abaya`
  - Price: `350`
  - Select any available product type
- Click "Add/Update" button
- Wait for success message

**Step 4: Billing System**
- Click "Billing" in sidebar
- Search for "Moroccon Abaya" → Select from dropdown
- Click "Add" button
- Search for "Abaya stitching" → Select from dropdown  
- Click "Add" button
- Click "Print Bill" button
- Show bill page for 3 seconds

**Step 5: Customer Management**
- Click "Customers" in sidebar
- Show customer interface (wait 2 seconds)

**Step 6: Employee Management**
- Click "Employees" in sidebar
- Show employee interface (wait 2 seconds)

**Step 7: Expense Management**
- Navigate to: `http://localhost:5000/expenses`
- Show expense interface (wait 2 seconds)

**Step 8: Reports**
- Navigate back to: `http://localhost:5000/app`
- Click "Reports" in sidebar
- Show reports interface (wait 2 seconds)

**Step 9: Mobile View**
- Resize browser to mobile size (375x667)
- Show mobile interface (wait 2 seconds)
- Maximize window again

### 4. Stop Recording
- Stop your Chrome recording extension
- Save the video file

## 🎯 Demo Timeline:
- **Total Duration**: ~4-5 minutes
- **Login**: 30 seconds
- **Dashboard**: 30 seconds
- **Product Creation**: 45 seconds
- **Billing**: 60 seconds
- **Other Sections**: 30 seconds each
- **Mobile View**: 30 seconds

## 💡 Tips:
- **Pause between sections** for better video flow
- **Speak while recording** to explain each feature
- **Use slow, deliberate mouse movements** for professional look
- **Keep the demo focused** on key features

## 🔧 Troubleshooting:
- If Chrome profile doesn't work, use Option 3 (Manual Recording)
- Make sure Flask app is running before starting recording
- Test your recording extension before the full demo
