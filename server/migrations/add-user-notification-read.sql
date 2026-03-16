-- 用户各类型通知的“已读”时间，用于计算未读数（点赞/关注/评论）
-- 可重复执行

CREATE TABLE IF NOT EXISTS user_notification_read (
  user_id INT NOT NULL,
  notification_type VARCHAR(20) NOT NULL,
  last_read_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (user_id, notification_type),
  FOREIGN KEY (user_id) REFERENCES users(id)
);
