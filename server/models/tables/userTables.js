import pool from '../../database/database.js';

export const userTables = async () => {
  try {

    // 1. SCHOOLS
    await pool.query(`
      CREATE TABLE IF NOT EXISTS schools (
        id SERIAL PRIMARY KEY,
        school_id INT UNIQUE NOT NULL,
        name VARCHAR(200) NOT NULL,
        email VARCHAR(150) UNIQUE NOT NULL,
        password_hash VARCHAR(255) NOT NULL,
        created_at TIMESTAMP DEFAULT NOW()
      );
    `);

    // 2. USERS
    await pool.query(`
      CREATE TABLE IF NOT EXISTS users (
        id SERIAL PRIMARY KEY,
        school_id INT NOT NULL REFERENCES schools(id) ON DELETE CASCADE,
        name VARCHAR(200) NOT NULL,
        email VARCHAR(150) NOT NULL,
        password_hash VARCHAR(255),
        can_manage_meals BOOLEAN DEFAULT FALSE,
        role VARCHAR(20) CHECK (role IN ('teacher','parent')) NOT NULL,
        phone VARCHAR(20),
        created_at TIMESTAMP DEFAULT NOW(),
        UNIQUE (school_id, email)
      );
    `);

    // 3. CLASSES
    await pool.query(`
      CREATE TABLE IF NOT EXISTS classes (
        id SERIAL PRIMARY KEY,
        school_id INT NOT NULL REFERENCES schools(id) ON DELETE CASCADE,
        name VARCHAR(50) NOT NULL,
        section VARCHAR(10),
        created_at TIMESTAMP DEFAULT NOW(),
        UNIQUE (school_id, name, section)
      );
    `);

    // 4. TEACHER - CLASS MAP
    await pool.query(`
      CREATE TABLE IF NOT EXISTS teacher_classes (
        id SERIAL PRIMARY KEY,
        teacher_id INT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        class_id INT NOT NULL REFERENCES classes(id) ON DELETE CASCADE,
        UNIQUE (teacher_id, class_id),
        UNIQUE (class_id)
      );
    `);

    // 5. STUDENTS
    await pool.query(`
      CREATE TABLE IF NOT EXISTS students (
        id SERIAL PRIMARY KEY,
        school_id INT NOT NULL REFERENCES schools(id) ON DELETE CASCADE,
        class_id INT REFERENCES classes(id) ON DELETE SET NULL,
        name VARCHAR(150) NOT NULL,
        age INT NOT NULL,
        gender VARCHAR(10),
        created_at TIMESTAMP DEFAULT NOW()
      );
    `);

    // 6. parent_students mapping
    await pool.query(`
      CREATE TABLE IF NOT EXISTS parent_students (
        id SERIAL PRIMARY KEY,
        parent_id INT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        student_id INT NOT NULL REFERENCES students(id) ON DELETE CASCADE,
        UNIQUE (parent_id, student_id)
      );
    `);

    // 7. HEALTH RECORDS
    await pool.query(`
      CREATE TABLE IF NOT EXISTS health_records (
        id SERIAL PRIMARY KEY,
        student_id INT NOT NULL REFERENCES students(id) ON DELETE CASCADE,
        teacher_id INT REFERENCES users(id) ON DELETE SET NULL,
        height_cm DECIMAL(5,2),
        weight_kg DECIMAL(5,2),
        muac_cm DECIMAL(5,2),
        bmi DECIMAL(5,2),
        bmi_category VARCHAR(50),
        recorded_at DATE DEFAULT CURRENT_DATE,
        created_at TIMESTAMP DEFAULT NOW()
      );
    `);


    console.log('✅ All tables created successfully');

  } catch (err) {
    console.error('❌ Error creating tables:', err);
    throw err;
  }
};
