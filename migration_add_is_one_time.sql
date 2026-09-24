-- 🌟 เพิ่มคอลัมน์ "ทำครั้งเดียว" ในตาราง tasks
ALTER TABLE `tasks`
  ADD COLUMN `is_one_time` TINYINT(1) NOT NULL DEFAULT 0
  COMMENT 'ทำครั้งเดียว (1=ส่งครั้งเดียวในช่วง start_date-end_date, 0=ทำทุกวัน)'
  AFTER `target_stores`;
