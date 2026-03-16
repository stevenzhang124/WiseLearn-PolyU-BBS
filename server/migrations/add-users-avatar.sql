-- 为已有 users 表添加 avatar 列（新建库已包含在 schema.sql，仅旧库需执行本句）
ALTER TABLE users ADD COLUMN avatar VARCHAR(512) NULL;
