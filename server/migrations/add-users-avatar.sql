-- 为已有 users 表添加 avatar 列（若已存在则跳过，可重复执行）
-- 若报 Duplicate column name 'avatar' 说明列已存在，可忽略。

DROP PROCEDURE IF EXISTS add_users_avatar_column;

DELIMITER //
CREATE PROCEDURE add_users_avatar_column()
BEGIN
  IF (SELECT COUNT(*) FROM information_schema.COLUMNS
      WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'users' AND COLUMN_NAME = 'avatar') = 0
  THEN
    ALTER TABLE users ADD COLUMN avatar VARCHAR(512) NULL;
  END IF;
END//
DELIMITER ;

CALL add_users_avatar_column();
DROP PROCEDURE add_users_avatar_column;
