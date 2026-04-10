import pool from '../../database/database.js';

export const userTables = async () => {
  try {

    // 1. ADMIN / PRINCIPAL
    await pool.query(`
      CREATE TABLE IF NOT EXISTS admin (
        id            SERIAL PRIMARY KEY,
        school_id     VARCHAR(100) PRIMARY KEY,
        name          VARCHAR(200) NOT NULL,
        email         VARCHAR(100) UNIQUE NOT NULL,
        username      VARCHAR(100) UNIQUE NOT NULL,
        password_hash VARCHAR(255) NOT NULL,
        created_at    TIMESTAMP DEFAULT NOW(),
        updated_at    TIMESTAMP DEFAULT NOW()
      );
    `);

    // 2. TEACHER
    await pool.query(`
      CREATE TABLE IF NOT EXISTS teacher (
        id               SERIAL PRIMARY KEY,
        school_id        VARCHAR(100) NOT NULL REFERENCES admin(school_id) ON DELETE CASCADE,
        name             VARCHAR(100) NOT NULL,
        email            VARCHAR(100) UNIQUE NOT NULL,
        username         VARCHAR(100) UNIQUE NOT NULL,
        password_hash    VARCHAR(255) NOT NULL,
        classes_assigned VARCHAR(50),
        created_at       TIMESTAMP DEFAULT NOW(),
        updated_at       TIMESTAMP DEFAULT NOW()
      );
    `);

    // 4. STUDENT
    await pool.query(`
      CREATE TABLE IF NOT EXISTS student (
        id         SERIAL PRIMARY KEY,
        school_id  VARCHAR(100) NOT NULL REFERENCES admin(school_id) ON DELETE CASCADE,
        teacher_id INT REFERENCES teacher(id) ON DELETE SET NULL,
        name       VARCHAR(100) NOT NULL,
        age        INT NOT NULL,
        class      VARCHAR(50) NOT NULL,
        gender     VARCHAR(10) CHECK (gender IN ('male', 'female', 'other')),
        created_at TIMESTAMP DEFAULT NOW(),
        updated_at TIMESTAMP DEFAULT NOW()
      );
    `);

    // 5. PARENT
    await pool.query(`
      CREATE TABLE IF NOT EXISTS parent (
        id            SERIAL PRIMARY KEY,
        student_id    INT NOT NULL REFERENCES student(id) ON DELETE CASCADE,
        name          VARCHAR(200) NOT NULL,
        email         VARCHAR(100) UNIQUE NOT NULL,
        username      VARCHAR(100) UNIQUE NOT NULL,
        password_hash VARCHAR(255) NOT NULL,
        phone         VARCHAR(20),
        created_at    TIMESTAMP DEFAULT NOW(),
        updated_at    TIMESTAMP DEFAULT NOW()
      );
    `);

    // 6. HEALTH RECORD
    await pool.query(`
      CREATE TABLE IF NOT EXISTS health_record (
        id               SERIAL PRIMARY KEY,
        student_id       INT NOT NULL REFERENCES student(id) ON DELETE CASCADE,
        teacher_id       INT NOT NULL REFERENCES teacher(id) ON DELETE SET NULL,
        height_cm        DECIMAL(5,2) NOT NULL,
        weight_kg        DECIMAL(5,2) NOT NULL,
        muac_cm          DECIMAL(5,2),
        bmi              DECIMAL(5,2),
        bmi_category     VARCHAR(50),
        recorded_at      DATE NOT NULL DEFAULT CURRENT_DATE,
        created_at       TIMESTAMP DEFAULT NOW()
      );
    `);

    console.log('✅ All user tables are ready');

  } catch (err) {
    console.error('❌ Error creating user tables:', err);
    throw err;
  }
};