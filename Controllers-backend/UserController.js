const db = require("../models")


const { validation, getPagingData, getPagination } = require("../utilities/function")
const Bcrypt = require("bcrypt");
const { status } = require("./AdminController");
const Op = db.Sequelize.Op


async function create_user(req, res) {
  // get data from database
  // id	user_id	permission_id	user_firstname	user_lastname	user_email	user_tel	user_tel_foreign	position_id	user_password	user_created_at	user_created_date	user_updated_at	user_updated_date	user_profile_file	user_group_id	status_id	status_login	last_update
  //console.log(req.body);
  // return false; 
  try {
    // const data = await db.User.findByPk({
    //   where: {
    //     email: req.body.email
    //   }
    // })
    let uploadedFiles = null;
    if (req.files && req.files.picture && req.files.picture !== 'undefined') {
        const licenseCopies = Array.isArray(req.files.picture) ? req.files.picture : [req.files.picture];
        

        for (let image_game of licenseCopies) {
            let ext = image_game.name.split('.').pop().toLowerCase();
            if (['jpg', 'jpeg', 'png'].includes(ext)) {
                var today = new Date();
                var date = `${today.getFullYear()}-${today.getMonth() + 1}-${today.getDate()}-${today.getHours()}${today.getMinutes()}${today.getSeconds()}`;
                var new_name = `${date}-${image_game.name}`;
                var savePath = `./images/banner/${new_name}`;
                
                try {
                    await image_game.mv(savePath);
                    uploadedFiles = `/images/banner/${new_name}`;
                } catch (error) {
                    return res.status(500).send({ status: 'error', msg: 'File save failed', error });
                }
            } else {
                return res.status(500).send({ status: 'error', msg: 'Invalid file type' });
            }
        }
    } else {
        //console.log("No valid picture files were uploaded or picture is undefined");
    }
    const data = await db.User.create({
      group_customer_id: req.body.group_customer_id,
      name: req.body.name,
      last_name: req.body.last_name,
      email: req.body.email,
      password: await Bcrypt.hashSync(req.body.password, 10),
      prefix : req.body.prefix,
      job_position_id: req.body.job_position_id,
      position_id: req.body.position_id,
      area_supervisor: req.body.area_supervisor,
      area_manager: req.body.area_manager,
      code: req.body.code,
      isActive: 'Y',
      groupId: req.body.groupId ? req.body.groupId : 0,
      picture: uploadedFiles
    })
    res.status(200).send({ status : "success", message: "เพิ่มข้อมูลเรียบร้อย" });
  } catch (error) {
    res.status(500).send({ status: "error", message: error.message || "ไม่สามารถเพิ่มข้อมูลได้ในตอนนี้!" });
  }
}
async function update_user(req, res) {
  // get data from database
  // id	user_id	permission_id	user_firstname	user_lastname	user_email	user_tel	user_tel_foreign	position_id	user_password	user_created_at	user_created_date	user_updated_at	user_updated_date	user_profile_file	user_group_id	status_id	status_login	last_update
  // //console.log(req.body);
  // return false; 
  try {
    // const data = await db.User.findByPk({
    //   where: {
    //     email: req.body.email
    //   }
    // })
    let dataUser1 = await db.User.findOne({
        where: {
            id: req.body.id
        },
    });
    let uploadedFiles = dataUser1.picture;
    if (req.files && req.files.picture && req.files.picture !== 'undefined') {
        const licenseCopies = Array.isArray(req.files.picture) ? req.files.picture : [req.files.picture];
        

        for (let image_game of licenseCopies) {
            let ext = image_game.name.split('.').pop().toLowerCase();
            if (['jpg', 'jpeg', 'png'].includes(ext)) {
                var today = new Date();
                var date = `${today.getFullYear()}-${today.getMonth() + 1}-${today.getDate()}-${today.getHours()}${today.getMinutes()}${today.getSeconds()}`;
                var new_name = `${date}-${image_game.name}`;
                var savePath = `./images/banner/${new_name}`;
                
                try {
                    await image_game.mv(savePath);
                    uploadedFiles = `/images/banner/${new_name}`;
                } catch (error) {
                    return res.status(500).send({ status: 'error', msg: 'File save failed', error });
                }
            } else {
                return res.status(500).send({ status: 'error', msg: 'Invalid file type' });
            }
        }
    } else {
        //console.log("No valid picture files were uploaded or picture is undefined");
    }

    await db.User.update({
      group_customer_id: req.body.group_customer_id,
      name: req.body.name,
      last_name: req.body.last_name,
      email: req.body.email,
      password: req.body.password ? await Bcrypt.hashSync(req.body.password, 10) : dataUser1.password,
      prefix : req.body.prefix,
      job_position_id: req.body.job_position_id,
      position_id: req.body.position_id,
      area_supervisor: req.body.area_supervisor,
      area_manager: req.body.area_manager,
      code: req.body.code,
      isActive: 'Y',
      groupId: req.body.groupId ? req.body.groupId : 0,
      picture: uploadedFiles
    }, { where: { id: req.body.id } });
    
    res.status(200).send({ status : "success", message: "เพิ่มข้อมูลเรียบร้อย" });
  } catch (error) {
    res.status(500).send({ status: "error", message: error.message || "ไม่สามารถเพิ่มข้อมูลได้ในตอนนี้!" });
  }
}
async function check_email(req, res) {

  try {

    const data = await db.User.findOne({
      where: {
        email: req.body.email
      }
    })

    res.status(200).send({ message: data });

  } catch (error) {
    res.status(500).send({ status: "error", message: error.message || "ไม่สามารถเพิ่มข้อมูลได้ในตอนนี้!" + req.body.email });
  }


}

async function create(req, res) {

  //console.log(req.body);
  //return status 200 
  const error = validation(req);
  if (error) {
    return res.status(422).json(error);
  }

  //email ซ้ำ
  const check_email = await db.User.findOne({
    where: {
      email: req.body.email
    }
  })

  if (check_email) {
    return res.status(422).json({ message: "Email นี้มีอยู่ในระบบแล้ว" });
  }

  try {
    await db.User.create({
      group_customer_id: req.body.group_customer_id,
      email: req.body.email,
      password: await Bcrypt.hashSync(req.body.password, 10),
      job_position_id: req.body.job_position_id,
      position_id: req.body.position_id,
      area_supervisor: req.body.area_supervisor,
      area_manager: req.body.area_manager,
      groupId: req.body.groupId,
      isActive: 'Y'
    })
    res.send({ status: "success", message: "เพิ่มข้อมูลเรียบร้อย" });
  } catch (err) {
    res.status(500).send({ status: "error", message: err.message || "ไม่สามารถเพิ่มข้อมูลได้ในตอนนี้!" });
  }

}

async function create_user_group(req, res) {
  // id	description	roleId	createdAt	updatedAt	groupname	

  try {
    const data = await db.UserGroup.create({
      groupname: req.body.groupname,
      description: req.body.description,
      roleId: req.body.roleId
    })
    res.status(200).send({ message: data });
  }
  catch (error) {
    res.status(500).send({ status: "error", message: error.message || "ไม่สามารถเพิ่มข้อมูลได้ในตอนนี้!" });
  }
}

async function create_users(req, res) {

  //inset data to database  
  try {
   
    const data = await db.Users.create({
      user_id: req.body.user_id,
      permission_id: req.body.permission_id,
      user_firstname: req.body.user_firstname,
      user_lastname: req.body.user_lastname,
      user_email: req.body.user_email,
      user_tel: req.body.user_tel,
      user_tel_foreign: req.body.user_tel_foreign,
      position_id: req.body.position_id,
      user_password: await Bcrypt.hashSync(req.body.user_password, 10),
      user_created_at: req.body.user_created_at,
      user_updated_at: req.body.user_updated_at,
      user_group_id: req.body.user_group_id,
      status_id: req.body.status_id,
      status_login: req.body.status_login,
    })
    res.status(200).send({ message: data });

  } catch (error) {
    res.status(500).send({ status: "error", message: error.message || "ไม่สามารถเพิ่มข้อมูลได้ในตอนนี้!" });
  }

}


//get_all_user_group
async function get_all_user_group(req, res) {
  try {
    let data = await db.UserGroup.findAll();
    res.send({ status: "success", data: data });
  } catch (err) {
    res.status(500).send({ status: "error", message: err.message || "ไม่สามารถแสดงข้อมูลได้ในตอนนี้!" });
  }
}

//get_user_group_by_id
async function get_user_group_by_id(req, res) {
  try {
    let data = await db.UserGroup.findByPk(req.params.id);
    res.send({ status: "success", data: data });
  } catch (err) {
    res.status(500).send({ status: "error", message: err.message || "ไม่สามารถแสดงข้อมูลได้ในตอนนี้!" });
  }
}
//get_user_for_admin
async function get_user_for_admin(req, res) {
  try {
    const whereConditions = {};
    if(req.body.position_name != "SuperAdmin"){
      if(req.body.position_name == "Supervisor" || req.body.position_name == "Assistant Management"){
        let dataUser = await db.User.findOne({
            where: {
                id: req.body.user_id
            },
        });
        if (dataUser.group_customer_id) whereConditions.group_customer_id = dataUser.group_customer_id;
        if (dataUser.area_supervisor) whereConditions.area_supervisor = dataUser.area_supervisor;
        if (dataUser.area_manager) whereConditions.area_manager = dataUser.area_manager;
      }else if(req.body.position_name == "พนักงาน"){
        if (req.body.user_id) whereConditions.id = req.body.user_id;
      }else{
        if (req.body.group_customer_id) whereConditions.group_customer_id = req.body.group_customer_id;
      }
    }
    let data = await db.User.findAll({
      where:whereConditions,
      attributes: ['id','code','name','last_name'],
    });
    res.send({ status: "success", data: data });
  } catch (err) {
    res.status(500).send({ status: "error", message: err.message || "ไม่สามารถแสดงข้อมูลได้ในตอนนี้!" });
  }
}
//update_user_group
async function update_user_group(req, res) {
  const id = req.params.id;
  const error = validation(req);
  if (error) {
    return res.status(422).json(error);
  }

  try {
    let row = await db.UserGroup.findByPk(req.params.id);
    if (!row) {
      throw new Error('ไม่สามารถทำรายการได้ เนื่องจากไม่พบรายการที่ต้องการแก้ไข');
    }
    await db.UserGroup.update(req.body, { where: { id: req.params.id } });
    res.send({ status: "success", message: "บันทึกข้อมูลเรียบร้อย" });
  } catch (err) {
    res.status(500).send({ status: "error", message: err.message || "ไม่สามารถบันทึกข้อมูลที่เลือกได้!" });
  }
}

//delete_user_group
async function delete_user_group(req, res) {
  const id = req.params.id;
  const error = validation(req);
  if (error) {
    return res.status(422).json(error);
  }

  try {
    let row = await db.UserGroup.findByPk(req.params.id);
    if (!row) {
      throw new Error('ไม่สามารถทำรายการได้ เนื่องจากไม่พบรายการที่ต้องการลบ');
    }
    await db.UserGroup.destroy({ where: { id: req.params.id } });
    res.send({ status: "success", message: "ลบข้อมูลเรียบร้อย" });
  } catch (err) {
    res.status(500).send({ status: "error", message: err.message || "ไม่สามารถแสดงข้อมูลได้ในตอนนี้!" });
  }

}


// ส่วนของพี่ต้นทำ ////////////////////////////////////////////////////////////////////////////////////////////////////////////
//get_all_user
async function get_all_user(req, res) {
  try {
    const whereConditions = {};
    if(req.body.position_name != "SuperAdmin"){
      if(req.body.position_name == "Supervisor"){
        let dataUser = await db.User.findOne({
            where: {
                id: req.body.user_id
            },
        });
        if (dataUser.group_customer_id) whereConditions.group_customer_id = dataUser.group_customer_id;
        if (dataUser.area_supervisor) whereConditions.area_supervisor = dataUser.area_supervisor;
        if (dataUser.area_manager) whereConditions.area_manager = dataUser.area_manager;
      }else if(req.body.position_name == "พนักงาน"){
        if (req.body.user_id) whereConditions.id = req.body.user_id;
      }else{
        if (req.body.group_customer_id) whereConditions.group_customer_id = req.body.group_customer_id;
      }
    }
    let data = await db.User.findAll({
      where: whereConditions,
      include: [
          {
              model: db.GroupCustomer,
              as: 'groupCustomer', // ใช้ 'as' ตามที่ตั้งไว้ใน associate
              required: false, // required: false ทำให้เป็น LEFT JOIN
          },
          {
              model: db.AreaSupervisor,
              as: 'areaSupervisor', // ใช้ 'as' ตามที่ตั้งไว้ใน associate
              required: false, // required: false ทำให้เป็น LEFT JOIN
          },
          {
              model: db.AreaManager,
              as: 'areaManager', // ใช้ 'as' ตามที่ตั้งไว้ใน associate
              required: false, // required: false ทำให้เป็น LEFT JOIN
          },
          {
              model: db.JobPosition,
              as: 'jobPosition', // ใช้ 'as' ตามที่ตั้งไว้ใน associate
              required: false, // required: false ทำให้เป็น LEFT JOIN
          },
          {
              model: db.Position,
              as: 'position', // ใช้ 'as' ตามที่ตั้งไว้ใน associate
              required: false, // required: false ทำให้เป็น LEFT JOIN
          },
      ],
    });
    res.send({ status: "success", data: data });
  } catch (err) {
    res.status(500).send({ status: "error", message: err.message || "ไม่สามารถแสดงข้อมูลได้ในตอนนี้!" });
  }
}
async function get_all_user_one(req, res) {
  try {
    const whereConditions = {};
    if (req.body.user_id) whereConditions.id = req.body.user_id;
    let data = await db.User.findOne({
      where: whereConditions,
      include: [
          {
              model: db.GroupCustomer,
              as: 'groupCustomer', // ใช้ 'as' ตามที่ตั้งไว้ใน associate
              required: false, // required: false ทำให้เป็น LEFT JOIN
          },
          {
              model: db.AreaSupervisor,
              as: 'areaSupervisor', // ใช้ 'as' ตามที่ตั้งไว้ใน associate
              required: false, // required: false ทำให้เป็น LEFT JOIN
          },
          {
              model: db.AreaManager,
              as: 'areaManager', // ใช้ 'as' ตามที่ตั้งไว้ใน associate
              required: false, // required: false ทำให้เป็น LEFT JOIN
          },
      ],
    });
    res.send({ status: "success", data: data });
  } catch (err) {
    res.status(500).send({ status: "error", message: err.message || "ไม่สามารถแสดงข้อมูลได้ในตอนนี้!" });
  }
}
async function get_all_user_filter(req, res) {
  try {
    const whereCondition = req.body.group_customer_id
      ? { group_customer_id: req.body.group_customer_id }
      : {};
    let data = await db.User.findAll({
      include: [
          {
              model: db.GroupCustomer,
              as: 'groupCustomer', // ใช้ 'as' ตามที่ตั้งไว้ใน associate
              required: false, // required: false ทำให้เป็น LEFT JOIN
          },
          {
              model: db.AreaSupervisor,
              as: 'areaSupervisor', // ใช้ 'as' ตามที่ตั้งไว้ใน associate
              required: false, // required: false ทำให้เป็น LEFT JOIN
          },
          {
              model: db.AreaManager,
              as: 'areaManager', // ใช้ 'as' ตามที่ตั้งไว้ใน associate
              required: false, // required: false ทำให้เป็น LEFT JOIN
          },
      ],
      where: whereCondition,
    });
    res.send({ status: "success", data: data });
  } catch (err) {
    res.status(500).send({ status: "error", message: err.message || "ไม่สามารถแสดงข้อมูลได้ในตอนนี้!" });
  }
}
async function test_update(req, res) {
  try {
    let data = await db.Store.findAll({
      where:{
        group_customer_id:5
      }
    });
    for (const record of data) {
        if (record.channel_id && record.channel_id > 0) {
            await db.Channel.update({
                group_customer_id: record.group_customer_id
            }, { where: { id: record.channel_id } });
        }
    }
    res.send({ status: "success", data: data });
  } catch (err) {
    res.status(500).send({ status: "error", message: err.message || "ไม่สามารถแสดงข้อมูลได้ในตอนนี้!" });
  }
}
async function update_user_isActive(req, res) {
  const id = req.params.id;
  const error = validation(req, ['isActive']);
  if (error) {
      return res.status(422).json(error);
  }

  try {
      let row = await db.User.findByPk(req.params.id);
      if (!row) {
          throw new Error('ไม่สามารถทำรายการได้ เนื่องจากไม่พบรายการที่ต้องการแก้ไข');
      }
      await db.User.update(req.body, { where: { id: id } });
      res.send({ status: "success", message: "บันทึกข้อมูลเรียบร้อย" });
  } catch (err) {
      res.status(500).send({ status: "error", message: err.message || "ไม่สามารถบันทึกข้อมูลที่เลือกได้!" });
  }
}

async function deleteUserPicture(req, res) {
    try {

        if (!req.body.userId) {
            return res.status(400).send({ status: "error", message: "ไม่พบ userId" });
        }

        await db.User.update({
          picture: null
        }, { where: { id: req.body.userId } });

        const updatedUser = await db.User.findOne({ where: { id: req.body.userId } });

        res.send({ status: "success", message: "ลบภาพสำเร็จ ", picture: updatedUser.picture });
        
    } catch (err) {
        res.status(500).send({ status: "error", message: err.message || "เกิดข้อผิดพลาด", stack: err.stack });
    }
}

module.exports = {

  create_user,
  update_user,
  check_email,
  create,
  create_user_group,
  create_users,
  get_all_user_group,
  get_user_group_by_id,
  get_user_for_admin,
  update_user_group,
  delete_user_group,

  get_all_user,
  get_all_user_one,
  get_all_user_filter,
  test_update,
  update_user_isActive,
  deleteUserPicture,
  // create: async (req, res) => {
  //   const error = validation(req);
  //   if (error) {
  //     return res.status(422).json(error);
  //   }


  //   try {
  //     await db.User.create({
  //       email: req.body.email,
  //       password: await Bcrypt.hashSync(req.body.password, 10),
  //       isActive: 'Y'
  //     })
  //     res.send({ status: "success", message: "เพิ่มข้อมูลเรียบร้อย" });
  //   } catch (err) {
  //     res.status(500).send({ status: "error", message: err.message || "ไม่สามารถเพิ่มข้อมูลได้ในตอนนี้!" });
  //   }

  // },

  findAll: async (req, res) => {
    const username = req.query.username;
    var condition = username ? { username: { [Op.like]: `%${username}%` } } : null;
    const { page, perPage, sort } = req.body;
    const { limit, offset } = getPagination(page, perPage);
    const order = [[sort.field ? sort.field : 'id', sort.desc ? 'DESC' : 'ASC']];

    try {
      let data = await db.User.findAndCountAll({
        where: condition, order, limit, offset
      });
      res.send(getPagingData(data, page, limit));
    } catch (err) {
      res.status(500).send({ status: "error", message: err.message || "ไม่สามารถแสดงข้อมูลได้ในตอนนี้!" });
    }
  },

  findOne: async (req, res) => {
    const id = req.params.id;
    const error = validation(req);
    if (error) {
      return res.status(422).json(error);
    }

    try {
      let row = await db.User.findByPk(req.params.id);
      res.send({ status: "success", row: row });
    } catch (err) {
      res.status(500).send({ status: "error", message: err.message || "ไม่สามารถแสดงข้อมูลที่เลือกได้!" });
    }
  },

  update: async (req, res) => {
    const id = req.params.id;
    const error = validation(req);
    if (error) {
      return res.status(422).json(error);
    }

    try {
      let row = await db.User.findByPk(req.params.id);
      if (!row) {
        throw new Error('ไม่สามารถทำรายการได้ เนื่องจากไม่พบรายการที่ต้องการแก้ไข');
      }
      delete req.body.username;
      if (req.body.password) {
        req.body.password = await Bcrypt.hashSync(req.body.password, 10);
      } else {
        delete req.body.password;
      }
      await db.User.update(req.body, { where: { id: req.params.id } });
      res.send({ status: "success", message: "บันทึกข้อมูลเรียบร้อย" });
    } catch (err) {
      res.status(500).send({ status: "error", message: err.message || "ไม่สามารถบันทึกข้อมูลที่เลือกได้!" });
    }

  },

  changepassword: async (req, res) => {
    const id = req.params.id;
    const error = validation(req);
    if (error) {
      return res.status(422).json(error);
    }

    try {
            
      let user = await db.User.findOne({where: { id: req.body.id }});
      
      await db.User.update({ 
        email: req.body.email ? req.body.email : user.email,
        password: req.body.password ? await Bcrypt.hashSync(req.body.password, 10) : user.password,
        name: req.body.name ? req.body.name : user.name,
        last_name: req.body.last_name ? req.body.last_name : user.last_name,
        prefix: req.body.prefix ? req.body.prefix : user.prefix,
        job_position_id: req.body.job_position_id ? req.body.job_position_id : user.job_position_id,
        position_id: req.body.position_id ? req.body.position_id : user.position_id,
        area_supervisor: req.body.area_supervisor ? req.body.area_supervisor : user.area_supervisor,
        area_manager: req.body.area_manager ? req.body.area_manager : user.area_manager,
        code: req.body.code ? req.body.code : user.code,
        group_customer_id: req.body.group_customer_id ? req.body.group_customer_id : user.group_customer_id        
      }, { where: { id: req.body.id } });

      
      res.send({ status: "success", message: "บันทึกข้อมูลเรียบร้อย" });
    } catch (err) {
      res.status(500).send({ status: "error", message: err.message || "ไม่สามารถบันทึกข้อมูลที่เลือกได้!" });
    }

  },
  edituser: async (req, res) => {
    const id = req.params.id;
    const error = validation(req);
    if (error) {
      return res.status(422).json(error);
    }

    try {
      if (req.body.password) {
        var newpassword = await Bcrypt.hashSync(req.body.password, 10);
        await db.User.update({ password: newpassword }, { where: { id: req.body.id } });
      }
      if (req.body.name) {
        await db.User.update({ name: req.body.name }, { where: { id: req.body.id } });
      }
      if (req.body.email) {
        await db.User.update({ email: req.body.email }, { where: { id: req.body.id } });
      }
      let dataUser1 = await db.User.findOne({
          where: {
              id: req.body.id
          },
      });
      let uploadedFiles = dataUser1.picture;
      if (req.files && req.files.picture && req.files.picture !== 'undefined') {
          const licenseCopies = Array.isArray(req.files.picture) ? req.files.picture : [req.files.picture];
          
  
          for (let image_game of licenseCopies) {
              let ext = image_game.name.split('.').pop().toLowerCase();
              if (['jpg', 'jpeg', 'png'].includes(ext)) {
                  var today = new Date();
                  var date = `${today.getFullYear()}-${today.getMonth() + 1}-${today.getDate()}-${today.getHours()}${today.getMinutes()}${today.getSeconds()}`;
                  var new_name = `${date}-${image_game.name}`;
                  var savePath = `./images/banner/${new_name}`;
                  
                  try {
                      await image_game.mv(savePath);
                      uploadedFiles = `/images/banner/${new_name}`;
                  } catch (error) {
                      return res.status(500).send({ status: 'error', msg: 'File save failed', error });
                  }
              } else {
                  return res.status(500).send({ status: 'error', msg: 'Invalid file type' });
              }
          }
      } else {
          //console.log("No valid picture files were uploaded or picture is undefined");
      }
      //console.log(uploadedFiles);
      if(uploadedFiles){
        await db.User.update({ picture: uploadedFiles }, { where: { id: req.body.id } });
      }

      let dataUser = await db.User.findOne({
          where: {
              id: req.body.id
          },
      });
      res.send({ status: "success", message: "บันทึกข้อมูลเรียบร้อย", picture: dataUser.picture });
    } catch (err) {
      res.status(500).send({ status: "error", message: err.message || "ไม่สามารถบันทึกข้อมูลที่เลือกได้!" });
    }

  },
  delete: async (req, res) => {
    const id = req.params.id;
    const error = validation(req);
    if (error) {
      return res.status(422).json(error);
    }

    try {
      let row = await db.User.findByPk(req.params.id);
      if (!row) {
        throw new Error('ไม่สามารถทำรายการได้ เนื่องจากไม่พบรายการที่ต้องการลบ');
      }
      await db.User.destroy({ where: { id: req.params.id } });
      res.send({ status: "success", message: "ลบข้อมูลเรียบร้อย" });
    } catch (err) {
      res.status(500).send({ status: "error", message: err.message || "ไม่สามารถแสดงข้อมูลได้ในตอนนี้!" });
    }

  },

  status: async (req, res) => {
    const id = req.params.id;
    const error = validation(req, ['isActive']);
    if (error) {
      return res.status(422).json(error);
    }

    try {
      let row = await db.User.findByPk(req.params.id);
      if (!row) {
        throw new Error('ไม่สามารถทำรายการได้ เนื่องจากไม่พบรายการที่ต้องการแก้ไข');
      }
      await db.User.update(req.body, { where: { id: id } });
      res.send({ status: "success", message: "บันทึกข้อมูลเรียบร้อย" });
    } catch (err) {
      res.status(500).send({ status: "error", message: err.message || "ไม่สามารถบันทึกข้อมูลที่เลือกได้!" });
    }
  },
  login: async (req, res) => {
    const error = validation(req);
    if (error) {
      return res.status(422).json(error);
    }

    try {
      let row = await db.User.scope("withPassword").findOne({ where: { username: req.body.username } });
      if (row) {
        var user = row.toJSON();
        const passwordIsValid = Bcrypt.compareSync(req.body.password, user.password);
        if (!passwordIsValid) {
          throw new Error("รหัสผ่านไม่ถูกต้อง.");
        }
        row.loginAt = Date();
        row.token = await Bcrypt.hashSync(row.username + row.loginAt, 10);
        await row.save();


        //Assign Token
        let payload = (await db.User.scope("withPublic").findByPk(row.id)).toJSON();
        let result = setUpCookie(res, null, payload)
        if (result.error) {
          throw new Error(result.message)
        }

        const foundItem = await db.Login.findOne({ where: { mode: 'User', user_id: payload.id } });
        if (!foundItem) {
          db.Login.create({ mode: 'User', user_id: payload.id, token: payload.token })
        } else {
          db.Login.update({ token: payload.token }, { where: { mode: 'User', user_id: payload.id } });
        }

        res.send({ status: "success", user: payload, token: payload.token, message: "เข้าระบบเรียบร้อยsdasdas" });
      } else {
        throw new Error("ไม่พบข้อมูลผู้ใช้นี้ในระบบ");
      }
    } catch (err) {
      res.status(500).send({ status: "error", message: err.message || "ไม่สามารถเข้าระบบได้" })
    }
  },

}
