# Testing Guide

## Prerequisites
- Backend running: `cd backend && python app.py`
- Frontend running: `cd frontend && npm run dev`

## Manual Testing Checklist

### Backend API Tests

#### Health Check
- [ ] Visit http://localhost:5000/health — should return `{"status": "healthy"}`

#### Image Upload Tests
- [ ] Upload a JPG food photo → should return calorie estimates
- [ ] Upload a PNG food photo → should work correctly  
- [ ] Upload a non-food image (e.g., car) → should say "not a food image"
- [ ] Try to upload a PDF file → should return error about file type
- [ ] Submit with no file → should return error

### Frontend Tests

#### Upload Interface
- [ ] Open http://localhost:5173
- [ ] The upload area is visible and clear
- [ ] Can click to browse files
- [ ] After selecting image, preview appears
- [ ] "Analyze Calories" button is enabled after selecting image
- [ ] "Analyze Calories" button is disabled when no image selected

#### Analysis Flow
- [ ] Upload a food photo and click "Analyze Calories"
- [ ] Loading spinner appears while waiting
- [ ] Button is disabled during loading
- [ ] Results display in a clear, readable format
- [ ] Results show individual food items and total calories

#### Error Handling
- [ ] Upload a non-food image → shows "not a food image" message
- [ ] Select a new image → clears previous results

### Integration Tests
- [ ] Full flow: upload image → get calories → upload new image → get new calories
- [ ] App works after refreshing the page
