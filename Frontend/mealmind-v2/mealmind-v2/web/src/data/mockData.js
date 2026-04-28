// Mock data — replace with real API calls using services/api.js

export const MOCK_STATS = {
  totalStudents: 152,
  healthy: 132,
  atRisk: 11,
  underweight: 9,
  overweight: 11,
  checkupsScheduled: 8,
  mealQuality: 8.5,
  criticalAlerts: 4,
}

export const GROWTH_TREND = [
  { month: 'Aug', normal: 128, overweight: 10, underweight: 8 },
  { month: 'Sep', normal: 129, overweight: 10, underweight: 8 },
  { month: 'Oct', normal: 130, overweight: 11, underweight: 9 },
  { month: 'Nov', normal: 131, overweight: 11, underweight: 9 },
  { month: 'Dec', normal: 131, overweight: 11, underweight: 8 },
  { month: 'Jan', normal: 132, overweight: 11, underweight: 9 },
]

export const BMI_DISTRIBUTION = [
  { category: 'Underweight', count: 9,   fill: '#ef4444' },
  { category: 'Healthy',     count: 132,  fill: '#1e7d47' },
  { category: 'Overweight',  count: 11,   fill: '#f59e0b' },
]

export const MALNUTRITION_BY_GRADE = [
  { grade: 'Grade 6',  normal: 82, overweight: 10, underweight: 8  },
  { grade: 'Grade 7',  normal: 78, overweight: 12, underweight: 10 },
  { grade: 'Grade 8',  normal: 80, overweight:  8, underweight: 12 },
  { grade: 'Grade 9',  normal: 85, overweight:  9, underweight:  6 },
  { grade: 'Grade 10', normal: 88, overweight:  7, underweight:  5 },
]

export const NUTRITION_STATUS = [
  { name: 'Meeting RDA', value: 65, color: '#1e7d47' },
  { name: 'Below RDA',   value: 25, color: '#f59e0b' },
  { name: 'Above RDA',   value: 10, color: '#ef4444' },
]

export const RDA_COMPARISON = [
  { nutrient: 'Protein',   current: 85, rda: 100 },
  { nutrient: 'Calcium',   current: 92, rda: 100 },
  { nutrient: 'Iron',      current: 76, rda: 100 },
  { nutrient: 'Vitamin D', current: 88, rda: 100 },
  { nutrient: 'Vitamin C', current: 95, rda: 100 },
  { nutrient: 'Zinc',      current: 70, rda: 100 },
]

export const STUDENTS = [
  { id: 'S101', name: 'Aarav Singh',    grade: '5A', age: 11, weight: 28, bmi: 16.2, status: 'Healthy',     lastCheckup: '15 Jan 2025' },
  { id: 'S102', name: 'Meera Patel',    grade: '7B', age: 13, weight: 32, bmi: 17.8, status: 'Healthy',     lastCheckup: '18 Jan 2025' },
  { id: 'S103', name: 'Rahul Kumar',    grade: '8C', age: 14, weight: 20, bmi: 13.2, status: 'Healthy',     lastCheckup: '12 Jan 2025' },
  { id: 'S104', name: 'Priya Kumar',    grade: '6A', age: 12, weight: 17, bmi: 12.9, status: 'Healthy',     lastCheckup: '10 Jan 2025' },
  { id: 'S105', name: 'Aditya Patel',   grade: '7B', age: 13, weight: 27, bmi: 10.9, status: 'At Risk',     lastCheckup: '20 Jan 2025' },
  { id: 'S106', name: 'Sara Ali',       grade: '4A', age: 10, weight: 18, bmi: 12.5, status: 'Healthy',     lastCheckup: '14 Jan 2025' },
  { id: 'S107', name: 'Noah Chen',      grade: '9A', age: 15, weight: 21, bmi: 14.1, status: 'Healthy',     lastCheckup: '22 Jan 2025' },
  { id: 'S108', name: 'Zara Ahmed',     grade: '2C', age:  8, weight: 14, bmi: 11.6, status: 'Underweight', lastCheckup: '8 Jan 2025'  },
  { id: 'S109', name: 'Kiran Reddy',    grade: '6B', age: 12, weight: 45, bmi: 28.1, status: 'Overweight',  lastCheckup: '19 Jan 2025' },
  { id: 'S110', name: 'Diya Sharma',    grade: '3A', age:  9, weight: 22, bmi: 15.4, status: 'Healthy',     lastCheckup: '11 Jan 2025' },
]

export const ALERTS = [
  { id: 1, type: 'critical', title: 'Severe underweight detected',      body: 'Zara Ahmed (2C) BMI 11.6 — immediate attention needed.',     time: '2h ago',   read: false },
  { id: 2, type: 'warning',  title: 'Mandatory vaccinations pending',   body: '3 students missed HPV booster this week.',                   time: '5h ago',   read: false },
  { id: 3, type: 'critical', title: 'Obesity risk flagged',             body: 'Kiran Reddy (6B) BMI 28.1 — counselling recommended.',       time: '1d ago',   read: false },
  { id: 4, type: 'info',     title: 'Meal menu approved',               body: 'March nutrition plan approved by the dietician.',             time: '3d ago',   read: true  },
  { id: 5, type: 'info',     title: 'Annual screening complete',        body: 'Grade 7 annual health checkup successfully logged.',          time: '2d ago',   read: true  },
  { id: 6, type: 'warning',  title: 'Missing 3 consecutive meals',      body: 'Aditya Patel (7B) has not taken lunch this week.',            time: '1d ago',   read: false },
]

export const MEAL_MENU = [
  { id: 1, day: 'Monday',    meal: 'Dal Tadka & Rice',       calories: 480, protein: 18, carbs: 72, fat: 12, score: 9.2, status: 'approved'  },
  { id: 2, day: 'Tuesday',   meal: 'Roti Sabzi & Dal',       calories: 420, protein: 14, carbs: 64, fat: 10, score: 8.8, status: 'approved'  },
  { id: 3, day: 'Wednesday', meal: 'Paneer Pulao & Raita',   calories: 510, protein: 22, carbs: 68, fat: 16, score: 8.5, status: 'approved'  },
  { id: 4, day: 'Thursday',  meal: 'Moong Dal Khichdi',      calories: 390, protein: 15, carbs: 62, fat:  8, score: 8.1, status: 'pending'   },
  { id: 5, day: 'Friday',    meal: 'Veg Biryani & Raita',    calories: 550, protein: 16, carbs: 80, fat: 14, score: 8.7, status: 'pending'   },
]

export const CHECKUPS = [
  { id: 1, student: 'Aarav Singh',  grade: '5A', date: '15 Jan 2025', height: 142, weight: 28, bmi: 13.9, vision: 'Normal', dental: 'Good',  status: 'Complete'  },
  { id: 2, student: 'Meera Patel',  grade: '7B', date: '18 Jan 2025', height: 150, weight: 32, bmi: 14.2, vision: 'Normal', dental: 'Fair',  status: 'Complete'  },
  { id: 3, student: 'Aditya Patel', grade: '7B', date: '20 Jan 2025', height: 148, weight: 27, bmi: 12.3, vision: 'Weak',   dental: 'Poor',  status: 'Flagged'   },
  { id: 4, student: 'Sara Ali',     grade: '4A', date: '14 Jan 2025', height: 128, weight: 18, bmi: 11.0, vision: 'Normal', dental: 'Good',  status: 'Complete'  },
  { id: 5, student: 'Kiran Reddy',  grade: '6B', date: '19 Jan 2025', height: 140, weight: 45, bmi: 22.9, vision: 'Normal', dental: 'Good',  status: 'Follow-up' },
  { id: 6, student: 'Diya Sharma',  grade: '3A', date: '',            height: null,weight: null,bmi: null, vision: null,     dental: null,    status: 'Scheduled' },
]

export const STAFF = [
  { id: 1, initial: 'S', name: 'Ms. Priya Sharma', role: 'Class Teacher — 5A', email: 'priya.sharma@school.edu', phone: '+91 98212 11111' },
  { id: 2, initial: 'A', name: 'Mr. Arjun Mehta',  role: 'Sports Coach',        email: 'arjun.mehta@school.edu',  phone: '+91 98212 22222' },
  { id: 3, initial: 'G', name: 'Dr. Neha Gupta',   role: 'School Nurse',         email: 'neha.gupta@school.edu',   phone: '+91 98212 33333' },
  { id: 4, initial: 'I', name: 'Ms. Kavya Iyer',   role: 'Dietician',            email: 'kavya.iyer@school.edu',   phone: '+91 98212 44444' },
]

export const PARENT_CHILD = {
  name: 'Aarav Singh', grade: '5A', age: 11, bmi: 16.2, status: 'Healthy', weight: 28, height: 142,
  mealsTaken: 18, mealsTotal: 20,
  nextCheckup: '15 Feb 2025',
  vaccinations: [
    { name: 'Hepatitis B',  date: 'Oct 2024', status: 'done' },
    { name: 'MMR',          date: 'Jan 2025', status: 'done' },
    { name: 'HPV Booster',  date: 'Feb 2025', status: 'pending' },
  ],
  weeklyMeals: [
    { day: 'Mon', eaten: true  },
    { day: 'Tue', eaten: true  },
    { day: 'Wed', eaten: false },
    { day: 'Thu', eaten: true  },
    { day: 'Fri', eaten: true  },
  ],
  bmiHistory: [
    { month: 'Aug', bmi: 15.1 },
    { month: 'Sep', bmi: 15.4 },
    { month: 'Oct', bmi: 15.7 },
    { month: 'Nov', bmi: 16.0 },
    { month: 'Dec', bmi: 16.1 },
    { month: 'Jan', bmi: 16.2 },
  ]
}

export const TEACHER_CLASS = {
  class: '7B', totalStudents: 18,
  healthy: 14, atRisk: 2, underweight: 1, overweight: 1,
  students: [
    { id: 'S201', name: 'Rohan Gupta',    bmi: 17.2, status: 'Healthy',     lastMeal: 'Today',     attendance: '92%' },
    { id: 'S202', name: 'Anjali Mehta',   bmi: 15.8, status: 'Healthy',     lastMeal: 'Today',     attendance: '88%' },
    { id: 'S203', name: 'Aditya Patel',   bmi: 10.9, status: 'At Risk',     lastMeal: 'Yesterday', attendance: '75%' },
    { id: 'S204', name: 'Fatima Khan',    bmi: 22.3, status: 'Overweight',  lastMeal: 'Today',     attendance: '95%' },
    { id: 'S205', name: 'Dev Sharma',     bmi: 16.0, status: 'Healthy',     lastMeal: 'Today',     attendance: '90%' },
    { id: 'S206', name: 'Riya Iyer',      bmi: 14.1, status: 'Underweight', lastMeal: '2 days ago',attendance: '82%' },
  ],
  todayMeal: { name: 'Dal Tadka & Rice', calories: 480, protein: 18, servingTime: '12:30 PM', servedCount: 16 }
}
