// 🌟 Helper สำหรับงานแบบ "ทำครั้งเดียว" (tasks.is_one_time = 1)
// งานแบบนี้ ถ้าพนักงานส่งไปแล้ว 1 ครั้งในช่วง start_date - end_date
// วันที่เหลือจะถือว่า "ส่งแล้ว" อัตโนมัติ (ไม่แจ้งเตือนซ้ำ แต่ยังแสดงในรายการตลอดช่วงเวลา)
const db = require("../models");
const TaskAssignment = db.TaskAssignment || db.task_assignments;

const isOneTime = (v) => v === true || v === 1 || v === '1' || v === 'true';

const toPlain = (item) => (item && typeof item.toJSON === 'function' ? item.toJSON() : item);

/**
 * หา assignment ที่ "ส่งแล้วจริง" (ครั้งแรก) ของงาน one-time ตามคู่ task_id + user_id
 * คืนค่าเป็น Map key = `${task_id}_${user_id}` -> { submitted_at, task_date }
 */
const getOneTimeDoneMap = async (pairs) => {
    const map = new Map();
    if (!pairs.length) return map;

    const taskIds = [...new Set(pairs.map(p => p.task_id))];
    const userIds = [...new Set(pairs.map(p => p.user_id))];

    const doneRows = await TaskAssignment.findAll({
        where: { task_id: taskIds, user_id: userIds, status: 'submitted' },
        attributes: ['task_id', 'user_id', 'task_date', 'submitted_at'],
        order: [['submitted_at', 'ASC']],
        raw: true
    });

    doneRows.forEach(r => {
        const key = `${r.task_id}_${r.user_id}`;
        if (!map.has(key)) map.set(key, r); // เก็บครั้งแรกที่ส่ง
    });
    return map;
};

/**
 * แปลงรายการ assignment (ต้อง include task_detail มาด้วย) ให้งาน one-time ที่ส่งไปแล้ว
 * แสดงสถานะเป็น 'submitted' ในทุกวันของช่วงงาน
 * - เปลี่ยนเฉพาะแถวที่เป็น 'pending' (แถวที่ 'leaved' ยังคงเป็นลา)
 * - เพิ่มฟิลด์ is_one_time, one_time_done, one_time_done_date ให้ Frontend ใช้แสดงผล
 */
const applyOneTimeStatus = async (items) => {
    const list = (items || []).map(toPlain);

    const candidates = list.filter(a => a.task_detail && isOneTime(a.task_detail.is_one_time));
    list.forEach(a => {
        a.is_one_time = !!(a.task_detail && isOneTime(a.task_detail.is_one_time));
        a.one_time_done = false;
        a.one_time_done_date = null;
    });
    if (!candidates.length) return list;

    const doneMap = await getOneTimeDoneMap(candidates);

    candidates.forEach(a => {
        const done = doneMap.get(`${a.task_id}_${a.user_id}`);
        if (!done) return;
        a.one_time_done = true;
        a.one_time_done_date = done.task_date;
        if (a.status === 'pending') {
            a.status = 'submitted';
            a.submitted_at = done.submitted_at;
        }
    });
    return list;
};

/**
 * ใช้แทน TaskAssignment.findOne(...) ในตอน auto-submit จากหน้ารายงาน
 * ข้ามงาน one-time ที่พนักงานส่งไปแล้ว เพื่อไม่ให้ไปกินสิทธิ์ของงานอื่นที่ report_type เดียวกัน
 */
const findSubmittableAssignment = async (options) => {
    const rows = await TaskAssignment.findAll(options);
    if (!rows.length) return null;

    const oneTimeRows = rows.filter(r => r.task_detail && isOneTime(r.task_detail.is_one_time));
    if (!oneTimeRows.length) return rows[0];

    const doneMap = await getOneTimeDoneMap(oneTimeRows);
    const target = rows.find(r => {
        if (!(r.task_detail && isOneTime(r.task_detail.is_one_time))) return true;
        return !doneMap.has(`${r.task_id}_${r.user_id}`);
    });
    return target || null;
};

module.exports = { isOneTime, applyOneTimeStatus, findSubmittableAssignment };
