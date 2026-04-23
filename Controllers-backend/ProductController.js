const db = require("../models")

const multer = require('multer');
const xlsx = require('xlsx');
const path = require('path');
const axios = require('axios');

const fs = require('fs');

const { validation, getPagingData, getPagination } = require("../utilities/function")
const Bcrypt = require("bcrypt");
const { json } = require("sequelize");
const Op = db.Sequelize.Op

//create product
async function create_product(req, res) {
    const error = validation(req);
    if (error) {
        return res.status(422).json(error);
    }

    try {
        await db.Product.create({
            group_customer_id: req.body.group_customer_id,
            categoryId: req.body.categoryId,
            sub_category_id: req.body.subcategoryId,
            brand_id: req.body.brand_id && req.body.brand_id !== "null" ? parseInt(req.body.brand_id) : null,
            sub_brand_id: req.body.sub_brand_id && req.body.sub_brand_id !== "null" ? parseInt(req.body.sub_brand_id) : null,
            name: req.body.name,
            flavor: req.body.flavor,
            variant: req.body.variant,
            product_size: req.body.product_size,
            product_barcode: req.body.product_barcode,
            pack_size: req.body.pack_size,
            competitor_id: req.body.competitor_id && req.body.competitor_id !== "null" ? parseInt(req.body.competitor_id) : null,
            promotion_id: req.body.promotion_id && req.body.promotion_id !== "null" ? parseInt(req.body.promotion_id) : null,
            picture: req.body.picture,
            price: req.body.price,
            qty: req.body.qty,
            unit: req.body.unit,
            
            imgGroupId: req.body.imgGroupId,
            isActive: 'Y'
        })
        res.send({ status: "success", message: "เพิ่มข้อมูลเรียบร้อย" });
    } catch (err) {
        res.status(500).send({ status: "error", message: err.message || "ไม่สามารถเพิ่มข้อมูลได้ในตอนนี้!" });
    }

}

//get all product
async function get_all_product(req, res) {
    try {
        const whereConditions = {};
        if(req.body.position_name != "SuperAdmin"){
            if (req.body.group_customer_id) whereConditions.group_customer_id = req.body.group_customer_id;
        }
        let data = await db.Product.findAll({
            where: whereConditions,
            include: [
                {
                    model: db.GroupCustomer,
                    as: 'groupCustomer', // ใช้ 'as' ตามที่ตั้งไว้ใน associate
                    required: false, // required: false ทำให้เป็น LEFT JOIN
                },{
                    model: db.Category,
                    as: 'category', // ใช้ 'as' ตามที่ตั้งไว้ใน associate
                    required: false, // required: false ทำให้เป็น LEFT JOIN
                },{
                    model: db.SubCategory,
                    as: 'subCategory', // ใช้ 'as' ตามที่ตั้งไว้ใน associate
                    required: false, // required: false ทำให้เป็น LEFT JOIN
                },{
                    model: db.Brand,
                    as: 'brand', // ใช้ 'as' ตามที่ตั้งไว้ใน associate
                    required: false, // required: false ทำให้เป็น LEFT JOIN
                    where: {
                        id: { [db.Sequelize.Op.or]: [null, { [db.Sequelize.Op.ne]: null }] }
                    }
                },{
                    model: db.SubBrand,
                    as: 'subBrand', // ใช้ 'as' ตามที่ตั้งไว้ใน associate
                    required: false, // required: false ทำให้เป็น LEFT JOIN
                    where: {
                        id: { [db.Sequelize.Op.or]: [null, { [db.Sequelize.Op.ne]: null }] }
                    }
                },{
                    model: db.Competitor,
                    as: 'competitor', // ใช้ 'as' ตามที่ตั้งไว้ใน associate
                    required: false, // required: false ทำให้เป็น LEFT JOIN
                    where: {
                        id: { [db.Sequelize.Op.or]: [null, { [db.Sequelize.Op.ne]: null }] }
                    }
                },{
                    model: db.ProductPromotion,
                    as: 'productPromotion', // ใช้ 'as' ตามที่ตั้งไว้ใน associate
                    required: false, // required: false ทำให้เป็น LEFT JOIN
                    where: {
                        id: { [db.Sequelize.Op.or]: [null, { [db.Sequelize.Op.ne]: null }] }
                    }
                }
            ],
        });
        if(data){
            const projectRoot = path.join(__dirname, '../');

            await Promise.all(
                data.map(async (item) => {
                    if (item.picture) {
                    const picPaths = item.picture.split(',');
                    const base64Images = await Promise.all(
                        picPaths.map(async (picPath) => {
                        const imagePath = path.resolve(projectRoot, picPath.trim());
                        const fileName = path.basename(picPath.trim());

                        try {
                            const imageData = await fs.promises.readFile(imagePath);
                            return {
                            url: `data:image/jpeg;base64,${imageData.toString('base64')}`,
                            name: fileName,
                            id: item.id
                            };
                        } catch (err) {
                            // console.error(`Error reading image (${fileName}):`, err.message);
                            return null;
                        }
                        })
                    );
                    item.dataValues.picture_cut = base64Images.filter(img => img !== null);
                    } else {
                    item.dataValues.picture_cut = [];
                    }
                })
            );
        }else{
            data = [];
        }
        
        res.send({ status: "success", data: data });
    } catch (err) {
        res.status(500).send({ status: "error", message: err.message || "ไม่สามารถแสดงข้อมูลได้ในตอนนี้!" });
    }
}

//get product by id
async function get_product_by_id(req, res) {
    try {
        let data = await db.Product.findByPk(req.params.id);

        if (!data) {
            throw new Error('ไม่พบข้อมูลที่ต้องการแสดง');
        }
        res.send({ status: "success", data: data });
    } catch (err) {
        res.status(500).send({ status: "error", message: err.message || "ไม่สามารถแสดงข้อมูลได้ในตอนนี้!" });
    }
}

async function get_product_by_groupcustomerid(req, res) {
    try {
        let data = await db.Product.findAll({
            where: { group_customer_id: req.params.id, isActive: 'Y' }
        });
        if (!data) {
            throw new Error('ไม่พบข้อมูลที่ต้องการแสดง');
        }
        res.send({ status: "success", data: data });
    } catch (err) {
        res.status(500).send({ status: "error", message: err.message || "ไม่สามารถแสดงข้อมูลได้ในตอนนี้!" });
    }
}

//update product
async function update_product(req, res) {
    // const id = req.params.id;
    const error = validation(req);
    if (error) {
        return res.status(422).json(error);
    }

    try {
        let Brand = await db.Brand.findOne({
            where: { name: 'Default' }
        });
        // let brand_id = req.body.brand_id && req.body.brand_id !== "null" ? parseInt(req.body.brand_id) : Brand.id
        // //console.log(brand_id);
        // return false;
        // let row = await db.Product.findByPk(req.params.id);
        let row = await db.Product.update({ 
            group_customer_id: req.body.group_customer_id,
            name: req.body.name,

            categoryId: req.body.categoryId ? parseInt(req.body.categoryId) : null,
            sub_category_id: req.body.subcategoryId && req.body.subcategoryId !== "null" ? parseInt(req.body.subcategoryId) : null,

            brand_id: req.body.brand_id && req.body.brand_id !== "null" ? parseInt(req.body.brand_id) : null,
            sub_brand_id: req.body.sub_brand_id && req.body.sub_brand_id !== "null" ? parseInt(req.body.sub_brand_id) : null,
            flavor: req.body.flavor || null,
            variant: req.body.variant || null,
            product_size: req.body.product_size || null,
            unit: req.body.unit || null,

            product_barcode: req.body.product_barcode || null,
            pack_size: req.body.pack_size || null,

            competitor_id: req.body.competitor_id && req.body.competitor_id !== "null" ? parseInt(req.body.competitor_id) : null,
            promotion_id: req.body.promotion_id && req.body.promotion_id !== "null" ? parseInt(req.body.promotion_id) : null,
        }, { 
            where: { id: req.body.id } 
        });

        // let uploadedFiles = null;
        // if (req.files && req.files.picture && req.files.picture !== 'undefined') {
        //     const licenseCopies = Array.isArray(req.files.picture) ? req.files.picture : [req.files.picture];
            
        //     //console.log(licenseCopies);
        //     for (let image_game of licenseCopies) {
        //         let ext = image_game.name.split('.').pop().toLowerCase();
        //         if (['jpg', 'jpeg', 'png'].includes(ext)) {
        //             var today = new Date();
        //             var date = `${today.getFullYear()}-${today.getMonth() + 1}-${today.getDate()}-${today.getHours()}${today.getMinutes()}${today.getSeconds()}`;
        //             var new_name = `${date}-${image_game.name}`;
        //             var savePath = `./images/banner/${new_name}`;
                    
        //             try {
        //                 await image_game.mv(savePath);
        //                 uploadedFiles = `/images/banner/${new_name}`;
        //             } catch (error) {
        //                 return res.status(500).send({ status: 'error', msg: 'File save failed', error });
        //             }
        //         } else {
        //             return res.status(500).send({ status: 'error', msg: 'Invalid file type' });
        //         }
        //     }
        // } else {
        //     //console.log("No valid picture files were uploaded or picture is undefined");
        // }
        // if(uploadedFiles){
        //     await db.Product.update({ picture: uploadedFiles }, { where: { id: req.body.id } });
        // }

        if (!row) {
            throw new Error('ไม่สามารถทำรายการได้ เนื่องจากไม่พบรายการที่ต้องการแก้ไข');
        }
        // await db.Product.update(req.body, { where: { id: req.body.id } });
        res.send({ status: "success", message: "บันทึกข้อมูลเรียบร้อย" });
    } catch (err) {
        res.status(500).send({ status: "error", message: err.message || "ไม่สามารถบันทึกข้อมูลที่เลือกได้!" });
    }

}
async function delete_picture(req, res) {
    // const id = req.params.id;
    const error = validation(req);
    if (error) {
        return res.status(422).json(error);
    }

    try {
        let row = await db.Product.update({ 
            picture: null
        }, { 
            where: { id: req.body.id } 
        });

        res.send({ status: "success", message: "บันทึกข้อมูลเรียบร้อย" });
    } catch (err) {
        res.status(500).send({ status: "error", message: err.message || "ไม่สามารถบันทึกข้อมูลที่เลือกได้!" });
    }

}
//update product isActive
async function update_product_isActive(req, res) {
    const id = req.params.id;
    const error = validation(req, ['isActive']);
    if (error) {
        return res.status(422).json(error);
    }

    try {
        let row = await db.Product.findByPk(req.params.id);
        if (!row) {
            throw new Error('ไม่สามารถทำรายการได้ เนื่องจากไม่พบรายการที่ต้องการแก้ไข');
        }
        await db.Product.update(req.body, { where: { id: req.params.id } });
        res.send({ status: "success", message: "บันทึกข้อมูลเรียบร้อย" });
    } catch (err) {
        res.status(500).send({ status: "error", message: err.message || "ไม่สามารถบันทึกข้อมูลที่เลือกได้!" });
    }

}

//import excel
// async function import_excel(req, res) {


// const filePath = 'uploads/' + req.file.filename;

// try {
//     // อ่านไฟล์ Excel
//     const workbook = xlsx.readFile(filePath);

//     // เลือก sheet แรก
//     const sheetName = workbook.SheetNames[0];
//     const worksheet = workbook.Sheets[sheetName];

//     // แปลงข้อมูลใน sheet เป็น JSON
//     const jsonData = xlsx.utils.sheet_to_json(worksheet);

//     // ส่งข้อมูลกลับเป็น JSON
//     res.json({
//         success: true,
//         data: jsonData
//     });
// } catch (error) {
//     console.error("Error reading file: ", error);
//     res.status(500).json({ success: false, message: 'Error reading Excel file' });
// }

// } 

async function import_excel(req, res) {
    //console.log(req.files.file_excel);
    try {
        // Check if file is present
        let file = req.files.file_excel;
        if (!file) {
            return res.status(400).send({ status: "error", message: "No file uploaded" });
        }

        var ext = file.name.split(".").pop(); // Get the file extension
        var today = new Date();
        var date = today.getFullYear() + '-' + (today.getMonth() + 1) + '-' + today.getDate() + '-' +
            today.getHours() + "" + today.getMinutes() + "" + today.getSeconds();
        var new_name = date + '.' + ext;

        const uploadDir = path.join(__dirname, '..', 'uploads', 'excel');
        if (!fs.existsSync(uploadDir)) {
            fs.mkdirSync(uploadDir, { recursive: true });
        }
        const filePath = path.join(uploadDir, new_name);
        await file.mv(filePath);
        let data = await read_excel(filePath);

        // Delete the file after processing
        fs.unlink('./uploads/excel/' + new_name, (unlinkErr) => {
            if (unlinkErr) {
                console.error("Error deleting file: ", unlinkErr);
            }
        }
        );


        //insert data to database to function insert_product
        let insert_data = await insert_product_optimized(data);
        // Return the parsed data as JSON
        return res.send({ status: "success", data: data });

    } catch (error) {
        console.error("Error in import_excel: ", error);
        return res.status(500).send({ status: "error", message: "Error processing file", stack: error.stack });
    }
}

async function read_excel(path) {
    try {
        // Read the Excel file
        const workbook = xlsx.readFile(path);

        // Select the first sheet
        const sheetName = workbook.SheetNames[0];
        const worksheet = workbook.Sheets[sheetName];

        // Convert sheet data to JSON
        const jsonData = xlsx.utils.sheet_to_json(worksheet);

        // Optionally delete the file after processing
        fs.unlink(path, (unlinkErr) => {
            if (unlinkErr) {
                console.error("Error deleting file: ", unlinkErr);
            }
        });

        // Return the parsed data as JSON
        return jsonData;

    } catch (error) {
        console.error("Error reading file: ", error);
        throw new Error("Error reading Excel file"); // Throw an error to be handled in import_excel
    }
}


async function downloadAndSaveImage(originalUrl, saveDir) {
    if (!originalUrl) return null;

    try {
        let downloadUrl = originalUrl;
        let fileId = null;

        const googleDriveMatch = originalUrl.match(/drive\.google\.com\/file\/d\/([^/]+)/);

        if (googleDriveMatch) {
            fileId = googleDriveMatch[1];
            downloadUrl = `https://drive.google.com/uc?export=download&id=${fileId}`;
        }

        const response = await axios({
            url: downloadUrl,
            method: 'GET',
            responseType: 'stream',
            timeout: 15000, // เพิ่ม timeout สำหรับการดาวน์โหลด
        });

        // สร้างชื่อไฟล์ที่ไม่ซ้ำกัน
        const fileName = fileId ? `${fileId}.jpg` : path.basename(new URL(originalUrl).pathname);
        const fullPath = path.join(saveDir, fileName);

        const writer = fs.createWriteStream(fullPath);
        response.data.pipe(writer);

        // รอให้การเขียนไฟล์เสร็จสิ้น
        await new Promise((resolve, reject) => {
            writer.on('finish', resolve);
            writer.on('error', reject);
        });

        return `/images/picture/${fileName}`;

    } catch (error) {
        console.error(`Failed to download image: ${originalUrl}`, error.message);
        return null; // คืนค่า null หากดาวน์โหลดไม่สำเร็จ
    }
}

// --- NEW, MORE ROBUST HELPER FUNCTIONS ---

/**
 * Finds or creates entities with no dependencies.
 * @returns {Map<string, number>} A map of name to ID.
 */
async function bulkFindOrCreateSimple(model, names) {
    if (names.size === 0) return new Map();
    const nameArray = [...names];
    const existing = await model.findAll({ where: { name: { [Op.in]: nameArray } } });
    
    const resultMap = new Map(existing.map(item => [item.name, item.id]));
    
    const newNames = nameArray.filter(name => !resultMap.has(name));
    if (newNames.length > 0) {
        const created = await model.bulkCreate(newNames.map(name => ({ name })), { returning: ['id', 'name'] });
        created.forEach(item => resultMap.set(item.name, item.id));
    }
    return resultMap;
}

/**
 * Finds or creates entities that have dependencies (e.g., Category depends on GroupCustomer).
 * @returns {Map<string, number>} A map of composite key to ID.
 */
async function bulkFindOrCreateWithDependencies(model, compositeKeys, parentMap, parentKeyField, grandParentMap, grandParentKeyField) {
    if (compositeKeys.size === 0) return new Map();
    const keyArray = [...compositeKeys];

    // Prepare data for querying and creating by resolving parent IDs first
    const itemsToProcess = keyArray.map(key => {
        const parts = key.split('|');
        const name = parts[0];
        const parentKey = parts.slice(1).join('|'); // Reconstruct parent's composite key
        const parentId = parentMap.get(parentKey);

        if (!parentId) return null; // Skip if parent ID can't be resolved

        const data = { name, [parentKeyField]: parentId };

        // Handle grandparent dependency (e.g., SubCategory also needs group_customer_id)
        if (grandParentMap && grandParentKeyField) {
            const grandParentName = parts[parts.length - 1]; // Assumes grandparent is the last part
            const grandParentId = grandParentMap.get(grandParentName);
            if (grandParentId) {
                data[grandParentKeyField] = grandParentId;
            } else {
                return null; // Skip if grandparent ID can't be resolved
            }
        }
        return { originalKey: key, data };
    }).filter(Boolean); // Remove items with unresolved dependencies

    if (itemsToProcess.length === 0) return new Map();

    // Find existing items in bulk
    const whereClauses = itemsToProcess.map(item => item.data);
    const existing = await model.findAll({ where: { [Op.or]: whereClauses } });

    const resultMap = new Map();
    const existingItemsSet = new Set(); // To track which items already exist using a stringified version of their data

    existing.forEach(item => {
        const originalItem = itemsToProcess.find(p =>
            p.data.name === item.name &&
            p.data[parentKeyField] === item[parentKeyField] &&
            (grandParentKeyField ? p.data[grandParentKeyField] === item[grandParentKeyField] : true)
        );
        if (originalItem) {
            resultMap.set(originalItem.originalKey, item.id);
            existingItemsSet.add(JSON.stringify(originalItem.data));
        }
    });

    // Create new items in bulk
    const itemsToCreate = itemsToProcess
        .filter(item => !existingItemsSet.has(JSON.stringify(item.data)))
        .map(item => item.data);

    if (itemsToCreate.length > 0) {
        const created = await model.bulkCreate(itemsToCreate, { returning: true });
        created.forEach(item => {
            const originalItem = itemsToProcess.find(p =>
                p.data.name === item.name &&
                p.data[parentKeyField] === item[parentKeyField] &&
                (grandParentKeyField ? p.data[grandParentKeyField] === item[grandParentKeyField] : true)
            );
            if (originalItem) {
                resultMap.set(originalItem.originalKey, item.id);
            }
        });
    }
    return resultMap;
}


async function insert_product_optimized(data) {
    try {
        console.time('Total Import Time');

        // --- STEP 1: Aggregate unique composite keys for all related entities ---
        console.time('Step 1: Aggregation');
        const unique = {
            groupCustomers: new Set(),
            // Format: "Name|ParentName"
            categories: new Set(),
            brands: new Set(),
            competitors: new Set(),
            promotions: new Set(),
            // Format: "Name|ParentName|GrandParentName"
            subCategories: new Set(),
            subBrands: new Set(),
        };

        data.forEach(row => {
            const groupCustomerName = row['กลุ่มลูกค้า'];
            const categoryName = row['Category'];
            const subCategoryName = row['Sub Category'];
            const brandName = row['Brand'];
            const subBrandName = row['Sub brand'];

            if (groupCustomerName) unique.groupCustomers.add(groupCustomerName);
            if (categoryName && groupCustomerName) unique.categories.add(`${categoryName}|${groupCustomerName}`);
            if (brandName && groupCustomerName) unique.brands.add(`${brandName}|${groupCustomerName}`);
            if (row['บริษัท ( สินค้าบริษัท, คู่แข่ง1, คู่แข่ง2 )'] && groupCustomerName) unique.competitors.add(`${row['บริษัท ( สินค้าบริษัท, คู่แข่ง1, คู่แข่ง2 )']}|${groupCustomerName}`);
            if (row['ส่งเสริมการขาย (คูปองส่วนลด, ของพรีเมี่ยม)'] && groupCustomerName) unique.promotions.add(`${row['ส่งเสริมการขาย (คูปองส่วนลด, ของพรีเมี่ยม)']}|${groupCustomerName}`);
            
            // Sub-entities need the full chain for their key
            if (subCategoryName && categoryName && groupCustomerName) unique.subCategories.add(`${subCategoryName}|${categoryName}|${groupCustomerName}`);
            if (subBrandName && brandName && groupCustomerName) unique.subBrands.add(`${subBrandName}|${brandName}|${groupCustomerName}`);
        });
        console.timeEnd('Step 1: Aggregation');


        // --- STEP 2: Bulk find or create entities in dependent stages ---
        console.time('Step 2: Bulk Find/Create');

        // Stage 2.1: Group Customers (no dependencies)
        const groupCustomerMap = await bulkFindOrCreateSimple(db.GroupCustomer, unique.groupCustomers);

        // Stage 2.2: Entities dependent on GroupCustomer
        const [categoryMap, brandMap, competitorMap, promotionMap] = await Promise.all([
            bulkFindOrCreateWithDependencies(db.Category, unique.categories, groupCustomerMap, 'group_customer_id'),
            bulkFindOrCreateWithDependencies(db.Brand, unique.brands, groupCustomerMap, 'group_customer_id'),
            bulkFindOrCreateWithDependencies(db.Competitor, unique.competitors, groupCustomerMap, 'group_customer_id'),
            bulkFindOrCreateWithDependencies(db.ProductPromotion, unique.promotions, groupCustomerMap, 'group_customer_id'),
        ]);

        // Stage 2.3: Entities dependent on other entities from Stage 2.2 AND GroupCustomer
        const [subCategoryMap, subBrandMap] = await Promise.all([
            bulkFindOrCreateWithDependencies(db.SubCategory, unique.subCategories, categoryMap, 'category_id', groupCustomerMap, 'group_customer_id'),
            bulkFindOrCreateWithDependencies(db.SubBrand, unique.subBrands, brandMap, 'brand_id', groupCustomerMap, 'group_customer_id'),
        ]);
        console.timeEnd('Step 2: Bulk Find/Create');


        // --- STEP 3: Download all images concurrently ---
        console.time('Step 3: Image Download');
        const imageSaveDir = path.join(__dirname, '..', 'images', 'picture');
        if (!fs.existsSync(imageSaveDir)) {
            fs.mkdirSync(imageSaveDir, { recursive: true });
        }
        const imageUrls = [...new Set(data.map(row => row['ภาพสินค้า']).filter(Boolean))];
        const imagePromises = imageUrls.map(url => downloadAndSaveImage(url, imageSaveDir));
        const downloadedImagePaths = await Promise.all(imagePromises);
        const imageUrlMap = new Map();
        imageUrls.forEach((url, index) => {
            if (downloadedImagePaths[index]) {
                imageUrlMap.set(url, downloadedImagePaths[index]);
            }
        });
        console.timeEnd('Step 3: Image Download');


        // --- STEP 4: Assemble final data and find existing products ---
        console.time('Step 4: Data Assembly');
        const bulkCreateData = [];
        const updateOperations = [];

        const rowsWithoutId = data.filter(row => !row['ID'] && row['Product name']);
        const productNamesToCheck = [...new Set(rowsWithoutId.map(row => row['Product name']))];
        const existingProductsByCompositeKeyMap = new Map();
        if (productNamesToCheck.length > 0) {
            const potentialDuplicates = await db.Product.findAll({ where: { name: { [Op.in]: productNamesToCheck } } });
            potentialDuplicates.forEach(p => {
                const key = [p.group_customer_id, p.categoryId, p.brand_id, p.sub_brand_id, p.sub_category_id, p.name].join('|');
                existingProductsByCompositeKeyMap.set(key, p);
            });
        }
        
        const existingProductsByIdMap = new Map();
        const existingProductIds = data.map(row => row['ID']).filter(Boolean);
        if (existingProductIds.length > 0) {
            const products = await db.Product.findAll({ where: { id: { [Op.in]: existingProductIds } } });
            products.forEach(p => existingProductsByIdMap.set(p.id, p));
        }

        for (const row of data) {
            const groupCustomerName = row['กลุ่มลูกค้า'];
            const categoryName = row['Category'];
            const subCategoryName = row['Sub Category'];
            const brandName = row['Brand'];
            const subBrandName = row['Sub brand'];

            const group_customer_id = groupCustomerMap.get(groupCustomerName);
            const categoryId = categoryMap.get(`${categoryName}|${groupCustomerName}`);
            const sub_category_id = subCategoryMap.get(`${subCategoryName}|${categoryName}|${groupCustomerName}`);
            const brand_id = brandMap.get(`${brandName}|${groupCustomerName}`);
            const sub_brand_id = subBrandMap.get(`${subBrandName}|${brandName}|${groupCustomerName}`);
            const competitor_id = competitorMap.get(`${row['บริษัท ( สินค้าบริษัท, คู่แข่ง1, คู่แข่ง2 )']}|${groupCustomerName}`);
            const promotion_id = promotionMap.get(`${row['ส่งเสริมการขาย (คูปองส่วนลด, ของพรีเมี่ยม)']}|${groupCustomerName}`);
            const picture = imageUrlMap.get(row['ภาพสินค้า']) || null;

            const productData = {
                group_customer_id, categoryId, sub_category_id: sub_category_id || null, brand_id, sub_brand_id: sub_brand_id || null,
                name: row['Product name'], flavor: row['Product Flavor'] || null, variant: row['variant'] || null,
                product_size: row['Product Size'], pack_size: row['Pack Size (Text)'] || null, unit: row['Units (หน่วย)'] || null,
                competitor_id: competitor_id || null, promotion_id: promotion_id || null, price: row['ราคา'] || 0, qty: row['จำนวน'] || 0,
                isActive: (row['Is Active'] === 'Yes' ? 'Y' : 'N'), picture
            };

            let existingProduct = null;
            if (row['ID']) {
                existingProduct = existingProductsByIdMap.get(row['ID']);
            } else if (row['Product name']) {
                const rowCompositeKey = [group_customer_id, categoryId, brand_id, sub_brand_id, sub_category_id, row['Product name']].join('|');
                existingProduct = existingProductsByCompositeKeyMap.get(rowCompositeKey);
            }

            if (existingProduct) {
                updateOperations.push(db.Product.update(productData, { where: { id: existingProduct.id } }));
            } else {
                productData.product_barcode = row['Product Barcode'] || null;
                bulkCreateData.push(productData);
            }
        }
        console.timeEnd('Step 4: Data Assembly');

        // --- STEP 5: Perform final bulk database operations ---
        console.time('Step 5: Final DB Write');
        if (bulkCreateData.length > 0) {
            await db.Product.bulkCreate(bulkCreateData);
        }
        if (updateOperations.length > 0) {
            await Promise.all(updateOperations);
        }
        console.timeEnd('Step 5: Final DB Write');

        console.timeEnd('Total Import Time');
        return true;
    } catch (error) {
        console.error("Error in optimized insert_product: ", error.stack);
        throw error;
    }
}

async function insert_productbk(data) {
    try {
        for (let i = 0; i < data.length; i++) {
            let group_customer_id = await findOrCreateEntity(db.GroupCustomer, data[i].group_customer_id, 'name');

            let categoryId = await findOrCreateEntity(db.Category, data[i].categoryId, 'name');
            let sub_category_id = await findOrCreateEntity(db.SubCategory, data[i].sub_category_id, 'name', { category_id: categoryId });
            let brand_id = await findOrCreateEntity(db.Brand, data[i].brand_id, 'name');
            let sub_brand_id = await findOrCreateEntity(db.SubBrand, data[i].sub_brand_id, 'name', { brand_id: brand_id });
            let existingProduct = await db.Product.findOne({
                where: { 
                    group_customer_id: group_customer_id,
                    categoryId: categoryId,
                    sub_brand_id: sub_brand_id,
                    brand_id: brand_id,
                    sub_category_id: sub_category_id,
                    name: data[i].name,
                } 
            });
            if (existingProduct) {
                // ตัวอย่างการใช้งาน
                const originalUrl = data[i].picture;
                
                // const downloadUrl = convertGoogleDriveUrl(originalUrl);

                const match = originalUrl.match(/\/d\/([^/]+)\//);
                if (!match) {
                    throw new Error("Invalid Google Drive URL");
                }
                const fileId = match[1];
                const downloadUrl = `https://drive.google.com/uc?export=download&id=${fileId}`;
                

                // ดึงรูปภาพจาก Google Drive
                const response = await axios({
                    url: downloadUrl,
                    method: 'GET',
                    responseType: 'stream'
                });

                // กำหนดที่เก็บไฟล์
                const savePath = path.join(__dirname, '../images/picture/');
                // const imagePath = path.resolve(projectRoot, picPath.trim());
                const fileName = `${fileId}.jpg`; // ตั้งชื่อไฟล์เป็น File ID
                const fullPath  = path.join(savePath, fileName);
                const writer = fs.createWriteStream(fullPath );

                response.data.pipe(writer);
                const saveDirectory = path.resolve(__dirname, '/images/picture/');
                const imageUrl = `/images/picture/${path.basename(fullPath )}`; // URL ที่ใช้เข้าถึงรูป
                //console.log(imageUrl);
                // //console.log(saveDirectory);

                const imageUrlx = `/images/picture/${fileName}`; // เก็บแค่ Path ที่เรียกจาก API
                await db.Product.update({ picture: imageUrl }, { where: { id: existingProduct.id } });

                // return new Promise((resolve, reject) => {
                //     writer.on('finish', () => resolve(fullPath ));
                //     writer.on('error', reject);
                // });
            }
        }
        
        //console.log('Products inserted/updated successfully');
    } catch (error) {
        console.error("Error inserting or updating data: ", error.message);
        throw new Error("Error inserting or updating data");
    }
}
async function findOrCreateEntity(model, value, field, additionalAttributes = {}) {
    if (!value) {
        return null;
    }

    try {
        const [entity] = await model.findOrCreate({
            where: { [field]: value },
            defaults: { ...additionalAttributes, [field]: value },
        });

        return entity.id;
    } catch (error) {
        console.error(`Error in findOrCreateEntity for model ${model.name}:`, error.message);
        throw new Error(`Error in findOrCreateEntity for model ${model.name}`);
    }
}
async function insert_product_bk(data) {
    try {
        // Loop through the data and insert into the database
        for (let i = 0; i < data.length; i++) {
            let group_customer_id = await db.GroupCustomer.findOne({
                where: { 
                    name: data[i].group_customer_id
                }
            });
            let categoryId = await db.Category.findOne({
                where: { 
                    name: data[i].categoryId
                }
            });
            let brand_id = await db.Brand.findOne({
                where: { 
                    name: data[i].brand_id
                }
            });
            let sub_brand_id = await db.SubBrand.findOne({
                where: { 
                    name: data[i].sub_brand_id
                }
            });
            let sub_brand_id_new = null;
            if(sub_brand_id){
                sub_brand_id_new = sub_brand_id.id;
            }
            
            if(!sub_brand_id){
                await db.SubBrand.create({
                    brand_id: data[i].brand_id,
                    name: data[i].sub_brand_id,
                    isActive: 'Y'
                })
                let sub_brand_id2 = await db.SubBrand.findOne({
                    where: { 
                        name: data[i].sub_brand_id
                    }
                });
                sub_brand_id_new = sub_brand_id2.id;
            }
            let competitor_id = await db.Competitor.findOne({
                where: { 
                    name: data[i].competitor_id
                }
            });
            let promotion_id = await db.Promotion.findOne({
                where: { 
                    name: data[i].promotion_id
                }
            });
            await db.Product.create({
                group_customer_id: group_customer_id.id,
                categoryId: categoryId.id,
                // brand_id:1,
                // sub_brand_id:1,
                brand_id: brand_id.id,
                sub_brand_id: (sub_brand_id?sub_brand_id:null),
                name: data[i].name,
                flavor: data[i].flavor,
                variant: data[i].variant,
                product_size: data[i].product_size,
                product_barcode: data[i].product_barcode,
                pack_size: data[i].pack_size,
                // competitor_id:1,
                competitor_id: (data[i].competitor_id?competitor_id.id:null),
                picture: null,
                // promotion_id:1,
                promotion_id: (data[i].promotion_id?promotion_id.id:null),
                price: 0,
                qty: 0,
                imgGroupId: 0,
                isActive: 'Y'
            });
        }
    } catch (error) {
        console.error("Error inserting data: ", error);
        throw new Error("Error inserting data"); // Throw an error to be handled in import_excel
    }

}
async function save_picture(req, res) {
    try {
          // ตรวจสอบว่ามีไฟล์ picture อยู่ในคำขอ
        //   const uploadedFiles_picture = [];
        //   if (req.files && req.files.picture && req.files.picture !== 'undefined') {
        //       const licenseCopies = Array.isArray(req.files.picture) ? req.files.picture : [req.files.picture];
              
  
        //       for (let image_game of licenseCopies) {
        //           let ext = image_game.name.split('.').pop().toLowerCase();
        //           if (['jpg', 'jpeg', 'png'].includes(ext)) {
        //               var today = new Date();
        //               var date = `${today.getFullYear()}-${today.getMonth() + 1}-${today.getDate()}-${today.getHours()}${today.getMinutes()}${today.getSeconds()}`;
        //               var new_name = `${date}-${image_game.name}`;
        //               var savePath = `./images/picture/${new_name}`;
          
        //               try {
        //                   await image_game.mv(savePath);
        //                   uploadedFiles_picture.push(`images/picture/${new_name}`);
        //               } catch (error) {
        //                   return res.status(500).send({ status: 'error', msg: 'File save failed', error });
        //               }
        //           } else {
        //               return res.status(500).send({ status: 'error', msg: 'Invalid file type' });
        //           }
        //       }
  
              
        //   } else {
        //       //console.log("No valid picture files were uploaded or picture is undefined");
        //   }
          
        //   let picture = '';
        //   if (uploadedFiles_picture.length > 0) {
        //       picture = picture ? `${uploadedFiles_picture.join(',')}` : uploadedFiles_picture.join(',');
        //   }
  
        //     let rowz = await db.Product.findByPk(req.body.id);
        //     if(rowz.picture!=""){
        //       picture = picture
        //     }
            
        //     var data = {
        //       picture: picture,
        //     };
        //     var row = await db.Product.update(data, { where: { id: req.body.id } });
          
          
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
            //console.log(uploadedFiles);
            if(uploadedFiles){
                await db.Product.update({ picture: uploadedFiles }, { where: { id: req.body.id } });
            }
    
            let dataProduct = await db.Product.findOne({
                where: {
                    id: req.body.id
                },
            });  
          
          res.send({ status: "success", message: "บันทึกข้อมูลเรียบร้อย",row:dataProduct.picture });
          
      
      
    } catch (err) {
      res.status(500).send({ status: "error", message: err.message });
    }
}
async function master_product(req, res) {
    try {
        const group_customer_id = req.body.group_customer_id;

        const whereConditions = {};
        if (req.body.group_customer_id)
            whereConditions.group_customer_id = group_customer_id;

        const [categories, subCategories, brands, subBrands, competitors, productPromotions] = await Promise.all([
            db.Category.findAll({
                where: { 
                    ...whereConditions, 
                    isActive: 'Y' 
                },
                attributes: ['id', 'name']
            }),
            db.SubCategory.findAll({
                where: { 
                    ...whereConditions, 
                    isActive: 'Y' 
                },
                attributes: ['id', 'name']
            }),
            db.Brand.findAll({
                where: {
                    ...whereConditions,
                    isActive: 'Y',
                    name: { [Op.ne]: null }
                },
                attributes: ['id', 'name']
            }),
            db.SubBrand.findAll({
                where: {
                    ...whereConditions,
                    isActive: 'Y',
                    name: { [Op.ne]: null }
                },
                attributes: ['id', 'name']
            }),
            db.Competitor.findAll({
                where: {
                    ...whereConditions,
                    isActive: 'Y',
                    name: { [Op.ne]: null }
                },
                attributes: ['id', 'name']
            }),
            db.ProductPromotion.findAll({
                where: {
                    ...whereConditions,
                    isActive: 'Y',
                    name: { [Op.ne]: null }
                },
                attributes: ['id', 'name']
            })
        ]);

        const masterData = {
            categories,
            subCategories,
            brands,
            subBrands,
            competitors,
            productPromotions
        };

        res.send({ status: "success", masterData });

    } catch (err) {
        res.status(500).send({
            status: "error",
            message: err.message || "ไม่สามารถแสดงข้อมูลได้ในตอนนี้!"
        });
    }
}
async function master_store(req, res) {
    try {
        const whereConditions = {};
        if (req.body.position_name != "SuperAdmin") {
            if (req.body.group_customer_id) whereConditions.group_customer_id = req.body.group_customer_id;
        }

        let data = await db.Store.findAll({
            where: whereConditions,
            include: [
                {
                    model: db.GroupCustomer,
                    as: 'groupCustomer', // ใช้ 'as' ตามที่ตั้งไว้ใน associate
                    required: false, // required: false ทำให้เป็น LEFT JOIN
                },
                {
                    model: db.Channel,
                    as: 'channel', // ใช้ 'as' ตามที่ตั้งไว้ใน associate
                    required: false, // required: false ทำให้เป็น LEFT JOIN
                },
                {
                    model: db.Account,
                    as: 'account', // ใช้ 'as' ตามที่ตั้งไว้ใน associate
                    required: false, // required: false ทำให้เป็น LEFT JOIN
                },
                {
                    model: db.AccountType,
                    as: 'accountType', // ใช้ 'as' ตามที่ตั้งไว้ใน associate
                    required: false, // required: false ทำให้เป็น LEFT JOIN
                },
                {
                    model: db.Provinces,
                    as: 'provinces', // ใช้ 'as' ตามที่ตั้งไว้ใน associate
                    required: false, // required: false ทำให้เป็น LEFT JOIN
                },
            ],
            raw: true,  
            nest: true  
        });

        // 📌 ถ้าข้อมูลว่าง ให้ return ค่าเริ่มต้น
        if (!data || data.length === 0) {
            return res.json({
                channels: [],
                accounts: [],
                accountTypes: [],
                provinces: []
            });
        }

        // // 📌 ใช้ Set เพื่อเก็บค่าไม่ซ้ำกัน
        // const groupByUnique = (data, key) => {
        //     return Array.from(new Map(data
        //         .filter(item => item[key]) // กรองข้อมูลที่มีค่า
        //         .map(item => [item[key].id, { id: item[key].id, name: item[key].name, name_in_thai: item[key].name_in_thai }])
        //     ).values());
        // };

        let channels = await db.Channel.findAll({
            where: { ...whereConditions, isActive: 'Y'},
            raw: true,
            nest: true
        });
        let accounts = await db.Account.findAll({
            where: { ...whereConditions, isActive: 'Y'},
            raw: true,
            nest: true
        });
        let accountTypes = await db.AccountType.findAll({
            where: { ...whereConditions, isActive: 'Y'},
            raw: true,
            nest: true
        });
        let provinces = await db.Provinces.findAll({
            where: { isActive: 'Y'},
            raw: true,
            nest: true
        });

        // 📌 สร้าง Object สำหรับ return
        const masterData = {
            // channels: groupByUnique(data, "channel"),
            // accounts: groupByUnique(data, "account"),
            // accountTypes: groupByUnique(data, "accountType"),
            // provinces: groupByUnique(data, "provinces"),
            channels: channels,
            accounts: accounts,
            accountTypes: accountTypes,
            provinces: provinces,
        };
        res.send({ status: "success", masterData });
    } catch (err) {
        res.status(500).send({ status: "error", message: err.message || "ไม่สามารถแสดงข้อมูลได้ในตอนนี้!" });
    }
}
async function master_subbrand(req, res) {
    try {
        let data = await db.SubBrand.findAll({
            where: { brand_id: req.body.brand_id }
        });
        if (!data) {
            throw new Error('ไม่พบข้อมูลที่ต้องการแสดง');
        }
        res.send({ status: "success", data: data });
    } catch (err) {
        res.status(500).send({ status: "error", message: err.message || "ไม่สามารถแสดงข้อมูลได้ในตอนนี้!" });
    }
}
async function master_subcategories(req, res) {
    try {
        let data = await db.SubCategory.findAll({
            where: { category_id: req.body.categoryId }
        });
        if (!data) {
            throw new Error('ไม่พบข้อมูลที่ต้องการแสดง');
        }
        res.send({ status: "success", data: data });
    } catch (err) {
        res.status(500).send({ status: "error", message: err.message || "ไม่สามารถแสดงข้อมูลได้ในตอนนี้!" });
    }
}
async function master_brand(req, res){
    try {
        // let data = await db.Brand.findAll({
        //     where: { category_id: req.body.categoryId }
        // });
        let product = await db.Product.findAll({
            where: { categoryId: req.body.categoryId },
            attributes: ['brand_id']
        });

        const brandIds = product.map(p => p.brand_id).filter(id => id !== null);

        let data = await db.Brand.findAll({
            where: {
                id: {
                    [Op.in]: brandIds
                },
                isActive:'Y'
            }
        });
        if (!data) {
            throw new Error('ไม่พบข้อมูลที่ต้องการแสดง');
        }
        res.send({ status: "success", data: data });
    } catch (err) {
        res.status(500).send({ status: "error", message: err.message || "ไม่สามารถแสดงข้อมูลได้ในตอนนี้!" });
    }
}
module.exports = {

    create_product,
    get_all_product,
    get_product_by_id,
    get_product_by_groupcustomerid,
    update_product,
    update_product_isActive,
    import_excel,
    save_picture,
    delete_picture,
    master_product,
    master_subbrand,
    master_subcategories,
    master_store,
    master_brand,

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

}
