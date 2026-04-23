const express = require('express');
const multer = require('multer');
const fs = require('fs');
const path = require('path');
const xlsx = require('xlsx');
const router = express.Router();
const validate = require('../utilities/validate');
const { authenticateJWT } = require('../middleware/admin');
const TaskController = require('../Controllers-backend/TaskController');


// สร้าง Directory สำหรับเก็บไฟล์ชั่วคราว ถ้ายังไม่มี
const uploadDir = './uploads/temp';
if (!fs.existsSync(uploadDir)){
    fs.mkdirSync(uploadDir, { recursive: true });
}

// กำหนดค่า Multer ให้บันทึกไฟล์ลง Disk แทน Memory
const storage = multer.diskStorage({
    destination: function (req, file, cb) {
        cb(null, uploadDir); // บันทึกไฟล์ลงใน Folder './uploads/temp'
    },
    filename: function (req, file, cb) {
        // สร้างชื่อไฟล์ใหม่ที่ไม่ซ้ำกัน เพื่อป้องกันไฟล์ชื่อซ้ำกันเขียนทับ
        const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
        cb(null, file.fieldname + '-' + uniqueSuffix + path.extname(file.originalname));
    }
});

// Middleware ของ Multer ที่จะใช้ storage ใหม่
const upload = multer({
    storage: storage, // ❗️ ใช้ diskStorage ที่เราเพิ่งสร้าง
    limits: { fileSize: 1000 * 1024 * 1024 } // 100MB
}).any();

// const IndexController = require('../controllers-backend/IndexController'); 
// const BannerController = require('../controllers-backend/BannerController');
// const CategoryController = require('../controllers-backend/CategoryController');

const AdminController = require('../Controllers-backend/AdminController');
const UserController = require('../Controllers-backend/UserController');
const RoleController = require('../Controllers-backend/RoleController');
const PermissionController = require('../Controllers-backend/PermissionController');
const ProductController = require('../Controllers-backend/ProductController');
const CategoryController = require('../Controllers-backend/CategoryController');
const SubCategoryController = require('../Controllers-backend/SubCategoryController');
const { TimeoutError } = require('sequelize');

const AccountController = require('../Controllers-backend/AccountController');
const AccountTypeController = require('../Controllers-backend/AccountTypeController');
const AreaController = require('../Controllers-backend/AreaController');
const AreaManagerController = require('../Controllers-backend/AreaManagerController');
const AreaSupervisorController = require('../Controllers-backend/AreaSupervisorController');
const BrandController = require('../Controllers-backend/BrandController');
const ChannelController = require('../Controllers-backend/ChannelController');
const CompetitorController = require('../Controllers-backend/CompetitorController');
const GroupCustomerController = require('../Controllers-backend/GroupCustomerController');

const JobPositionController = require('../Controllers-backend/JobPositionController');

const PositionController = require('../Controllers-backend/PositionController');
const PosmController = require('../Controllers-backend/PosmController');

const PromotionController = require('../Controllers-backend/PromotionController');
const ProvincesController = require('../Controllers-backend/ProvincesController');
const ReasonForNotGettingSpaceController = require('../Controllers-backend/ReasonForNotGettingSpaceController');
const NoteoosstockController = require('../Controllers-backend/NoteoosstockController');

const StoreController = require('../Controllers-backend/StoreController');
const StoreToAccountController = require('../Controllers-backend/StoreToAccountController');
const SubBrandController = require('../Controllers-backend/SubBrandController');
const RentalAreaUnitController = require('../Controllers-backend/RentalAreaUnitController');
const NewProductController = require('../Controllers-backend/NewProductController');

const ImportuserController = require('../Controllers-backend/ImportuserController');
const ImportstoreController = require('../Controllers-backend/ImportstoreController');
const ImportstoreaccountController = require('../Controllers-backend/ImportstoreaccountController');
const ImportuserstoreController = require('../Controllers-backend/ImportuserstoreController');
const ImporpromotionController = require('../Controllers-backend/ImporpromotionController');
const ImportuserareaController = require('../Controllers-backend/ImportuserareaController');

const PlacementPointController = require('../Controllers-backend/PlacementPointController');
const ImportPlacementPointController = require('../Controllers-backend/ImportPlacementPointController');
const ImportRentalAreaUnitController = require('../Controllers-backend/ImportRentalAreaUnitController');
const importReasonfornotgettingspaceController = require('../Controllers-backend/importReasonfornotgettingspaceController');
const importNoteoosstockController = require('../Controllers-backend/importNoteoosstockController');
const importCompetitorController = require('../Controllers-backend/importCompetitorController');
const importposmController = require('../Controllers-backend/importposmController');
const ImportPositionController = require('../Controllers-backend/ImportPositionController');
const ImportProductToStoreController = require('../Controllers-backend/ImportProductToStoreController');
const ImportProductToComplianceController = require('../Controllers-backend/ImportProductToComplianceController');

const MapProductStoreController = require('../Controllers-backend/MapProductStoreController');
const MapProductStoreListController = require('../Controllers-backend/MapProductStoreListController');

const MapStoreComplianceController = require('../Controllers-backend/MapStoreComplianceController');
const MapStoreComplianceListController = require('../Controllers-backend/MapStoreComplianceListController');

const OosController = require('../Controllers-backend/OosController');
const OosListController = require('../Controllers-backend/OosListController');

const OfftakeController = require('../Controllers-backend/OfftakeController');
const OfftakeListController = require('../Controllers-backend/OfftakeListController');

const WeekController = require('../Controllers-backend/WeekController');
const WeekListController = require('../Controllers-backend/WeekListController');

const PricePromotionController = require('../Controllers-backend/PricePromotionController');
const PricePromotionListController = require('../Controllers-backend/PricePromotionListController');

const ComplianceController = require('../Controllers-backend/ComplianceController');
const ComplianceListController = require('../Controllers-backend/ComplianceListController');

const ExcelController = require('../Controllers-backend/ExcelController');
const ExportController = require('../Controllers-backend/ExportController');

const MailController = require('../Controllers-backend/MailController');
const MapUserStoreController = require('../Controllers-backend/MapUserStoreController');
const MapUserAreaController = require('../Controllers-backend/MapUserAreaController');

const FilterController = require('../Controllers-backend/FilterController');
const DashboardController = require('../Controllers-backend/DashboardController');
const DashboardOfftakeController = require('../Controllers-backend/DashboardOfftakeController');

router.get('/', (req, res) => {
    res.send('Hello World!');
});


// UserController
router.post('/create_user', UserController.create_user);
router.post('/update_user', UserController.update_user);

router.post('/user-create_admin', UserController.create);
router.post('/create_user_group', UserController.create_user_group);
router.post('/create_users', UserController.create_users);
router.post('/delete_picture', UserController.deleteUserPicture);

//create permission 
router.post('/create_permission', PermissionController.create_permission);
router.get('/get_all_permission', PermissionController.get_all_permission);
router.get('/get_permission/:id', PermissionController.get_permission_by_id);
//update permission
router.put('/update_permission/:id', PermissionController.update_permission);
//delete permission
router.delete('/delete_permission/:id', PermissionController.delete_permission);

// check email
router.post('/check_email', UserController.check_email);


// UserController
// router.get('/user_get_all', UserController.usergetall);
// router.get('/user_all', authenticateJWT, UserController.findOne);

// IndexController
// router.get('/', IndexController.index);

// Auth
router.post('/auth/login', AdminController.login);
// Role
router.post('/create_role', RoleController.create_role);
router.get('/get_all_role', authenticateJWT, RoleController.get_all_role);
router.get('/get_role/:id', RoleController.get_role_by_id);

//update role
router.put('/update_role/:id', RoleController.update_role);

//delete role
router.delete('/delete_role/:id', RoleController.delete_role);

//usergroup
router.post('/create_user_group', UserController.create_user_group);
router.get('/get_all_user_group', UserController.get_all_user_group);
router.get('/get_user_group/:id', UserController.get_user_group_by_id);
router.post('/get_user_for_admin', UserController.get_user_for_admin);

//update usergroup
router.put('/update_user_group/:id', UserController.update_user_group);
//delete usergroup
router.delete('/delete_user_group/:id', UserController.delete_user_group);


// Product 
router.post('/create_product', ProductController.create_product);
router.post('/get_all_product', ProductController.get_all_product);
router.get('/get_product/:id', ProductController.get_product_by_id);
router.get('/get_product_by_groupcustomerid/:id', ProductController.get_product_by_groupcustomerid);
router.post('/update_product', ProductController.update_product);
router.put('/update_product_isActive/:id', ProductController.update_product_isActive);
router.post('/save_picture', ProductController.save_picture);
router.post('/delete_picture', ProductController.delete_picture);
router.post('/master_product', ProductController.master_product);
router.post('/master_subbrand', ProductController.master_subbrand);
router.post('/master_subcategories', ProductController.master_subcategories);
router.post('/master_brand', ProductController.master_brand);
router.post('/master_store', ProductController.master_store);

//category
router.post('/create_category', CategoryController.create_category);
router.post('/get_all_category', CategoryController.get_all_category);
router.get('/get_category/:id', CategoryController.get_category_by_id);
router.put('/update_category/:id', CategoryController.update_category);
router.put('/update_category_isActive/:id', CategoryController.update_category_isActive);


//sup_category
router.post('/create_sub_category', SubCategoryController.create_sub_category);
router.post('/get_all_sub_category', SubCategoryController.get_all_sub_category);
router.get('/get_sub_category/:id', SubCategoryController.get_sub_category_by_id);
router.put('/update_sub_category/:id', SubCategoryController.update_sub_category);
router.put('/update_subcategory_isActive/:id', SubCategoryController.is_active_sub_category);

//import excel
// router.post('/import_excel', upload.single('file'), ProductController.import_excel);

router.post('/import_excel', ProductController.import_excel);
router.post('/import_user', ImportuserController.import_user);
router.post('/import_store', ImportstoreController.import_store);
router.post('/import_PlacementPoint', ImportPlacementPointController.import_PlacementPoint);
router.post('/import_RentalAreaUnit', ImportRentalAreaUnitController.import_RentalAreaUnit);
router.post('/import_storeaccount', ImportstoreaccountController.import_storeaccount);
router.post('/import_userstore', ImportuserstoreController.import_userstore);
router.post('/import_promotion', ImporpromotionController.import_promotion);
router.post('/import_MapUserArea', ImportuserareaController.import_MapUserArea);
router.post('/import_reasonfornotgettingspace', importReasonfornotgettingspaceController.import_reasonfornotgettingspace);
router.post('/import_Noteoosstock', importNoteoosstockController.import_Noteoosstock);
router.post('/import_Competitor', importCompetitorController.import_Competitor);
router.post('/import_posm', importposmController.import_posm);
router.post('/import_position', ImportPositionController.import_position);
router.post('/import_productTostore', ImportProductToStoreController.import_productTostore);
router.post('/import_productTocompliance', ImportProductToComplianceController.import_productTocompliance);

router.post('/import_user_store', ImportstoreController.import_user_store);

router.post('/upload', (req, res) => {

    let file = req.files.image;
    var ext = file.name.split(".")[1];
    // if(ext == 'jpg' || ext == 'jpeg' || ext == 'png'){
    var today = new Date();
    var date = today.getFullYear() + '-' + (today.getMonth() + 1) + '-' + today.getDate() + '' + today.getHours() + "" + today.getMinutes() + "" + today.getSeconds();
    var new_name = date + '.' + ext;
    file.mv('./uploads/excel/' + new_name);
    // await sharp('./images/Banner/' + new_name)
    // .resize(200, 200)
    // .toFile('./images/Banner/200x200-' + new_name);
    res.status(200).send({ status: 'success' });

});

router.get('/export-excel', ExcelController.exportExcel);
router.get('/exceloos/:id/:store_id/:group_id/:user_id/:startDate_select/:endDate_select', ExportController.exceloos);
router.get('/excelofftake/:id/:store_id/:group_id/:user_id/:startDate_select/:endDate_select', ExportController.excelofftake);
router.get('/excelweek/:id/:store_id/:group_id/:user_id/:startDate_select/:endDate_select', ExportController.excelweek);
router.get('/excelprice/:id/:store_id/:group_id/:user_id/:startDate_select/:endDate_select', ExportController.excelprice);
router.get('/excelcompliance/:id/:store_id/:user_id/:startDate_select/:endDate_select', ExportController.excelcompliance);
router.get('/excelcomplianceextra/:id/:store_id/:user_id/:startDate_select/:endDate_select', ExportController.excelcomplianceextra);

router.get('/sendmail', MailController.sendmail);
router.post('/send_forgot_email', MailController.send_forgot_email);

























// ส่วนของพี่ต้นทำ ////////////////////////////////////////////////////////////////////////////////////////////////////////////
router.post('/get_all_user', UserController.get_all_user);
router.post('/get_all_user_filter', UserController.get_all_user_filter);
router.post('/get_all_user_one', UserController.get_all_user_one);
router.put('/update_user_isActive/:id', UserController.update_user_isActive);

//account
router.post('/create_account', AccountController.create_account);
router.get('/account/data-table', authenticateJWT, AccountController.findAll);
router.post('/get_all_account', AccountController.get_all_account);
router.get('/get_account/:id', AccountController.get_account_by_id);
router.put('/update_account/:id', AccountController.update_account);
router.put('/update_account_isActive/:id', AccountController.update_account_isActive);
router.post('/get_all_account_filter', AccountController.get_all_account_filter);
router.post('/get_all_account_filter_user', AccountController.get_all_account_filter_user);

//account_type
router.post('/create_account_type', AccountTypeController.create_account_type);
router.post('/account_type/data-table', authenticateJWT, AccountTypeController.findAll);
router.post('/get_all_account_type', AccountTypeController.get_all_account_type);
router.get('/get_account_type/:id', AccountTypeController.get_account_type_by_id);
router.post('/get_account_type_by_accountid', AccountTypeController.get_account_type_by_accountid);
router.put('/update_account_type/:id', AccountTypeController.update_account_type);
router.put('/update_account_type_isActive/:id', AccountTypeController.update_account_type_isActive);

//area
router.post('/create_area', AreaController.create_area);
router.post('/area/data-table', authenticateJWT, AreaController.findAll);
router.get('/get_all_area', AreaController.get_all_area);
router.get('/get_area/:id', AreaController.get_area_by_id);
router.put('/update_area/:id', AreaController.update_area);
router.put('/update_area_isActive/:id', AreaController.update_area_isActive);

//area_manager
router.post('/create_area_manager', AreaManagerController.create_area_manager);
router.post('/area_manager/data-table', authenticateJWT, AreaManagerController.findAll);
router.post('/get_all_area_manager', AreaManagerController.get_all_area_manager);
router.post('/get_all_area_manager_list', AreaManagerController.get_all_area_manager_list);
router.post('/filter_all_area_manager', AreaManagerController.filter_all_area_manager);

router.get('/get_area_manager/:id', AreaManagerController.get_area_manager_by_id);
router.put('/update_area_manager/:id', AreaManagerController.update_area_manager);
router.put('/update_area_manager_isActive/:id', AreaManagerController.update_area_manager_isActive);

//area_supervisor
router.post('/create_area_supervisor', AreaSupervisorController.create_area_supervisor);
router.post('/area_supervisor/data-table', authenticateJWT, AreaSupervisorController.findAll);
router.post('/get_all_area_supervisor', AreaSupervisorController.get_all_area_supervisor);
router.post('/get_all_area_supervisor_list', AreaSupervisorController.get_all_area_supervisor_list);
router.post('/filter_all_area_supervisor', AreaSupervisorController.filter_all_area_supervisor);

router.get('/get_area_supervisor/:id', AreaSupervisorController.get_area_supervisor_by_id);
router.put('/update_area_supervisor/:id', AreaSupervisorController.update_area_supervisor);
router.put('/update_area_supervisor_isActive/:id', AreaSupervisorController.update_area_supervisor_isActive);

//brand
router.post('/create_brand', BrandController.create_brand);
router.post('/brand/data-table', authenticateJWT, BrandController.findAll);
router.post('/get_all_brand', BrandController.get_all_brand);
router.get('/get_brand/:id', BrandController.get_brand_by_id);
router.put('/update_brand/:id', BrandController.update_brand);
router.put('/update_brand_isActive/:id', BrandController.update_brand_isActive);

//channel
router.post('/create_channel', ChannelController.create_channel);
router.post('/channel/data-table', authenticateJWT, ChannelController.findAll);
router.post('/get_all_channel', ChannelController.get_all_channel);
router.get('/get_channel/:id', ChannelController.get_channel_by_id);
router.put('/update_channel/:id', ChannelController.update_channel);
router.put('/update_channel_isActive/:id', ChannelController.update_channel_isActive);

//competitor
router.post('/create_Competitor', CompetitorController.create_Competitor);
router.post('/Competitor/data-table', authenticateJWT, CompetitorController.findAll);
router.post('/get_all_Competitor', CompetitorController.get_all_Competitor);
router.get('/get_Competitor/:id', CompetitorController.get_Competitor_by_id);
router.put('/update_Competitor/:id', CompetitorController.update_Competitor);
router.put('/update_Competitor_isActive/:id', CompetitorController.update_Competitor_isActive);
router.post('/get_all_Competitor_filter', CompetitorController.get_all_Competitor_filter);

//group_customer
router.post('/create_group_customer', GroupCustomerController.create_group_customer);
router.post('/group_customer/data-table', authenticateJWT, GroupCustomerController.findAll);
router.post('/get_all_group_customer', GroupCustomerController.get_all_group_customer);
router.post('/get_all_group_customer_user', GroupCustomerController.get_all_group_customer_user);

router.get('/get_group_customer/:id', GroupCustomerController.get_group_customer_by_id);
router.put('/update_group_customer/:id', GroupCustomerController.update_group_customer);
router.put('/update_group_customer_isActive/:id', GroupCustomerController.update_group_customer_isActive);
router.post('/get_all_group_name', GroupCustomerController.get_all_group_name);
router.post('/get_all_group_name_compliance', GroupCustomerController.get_all_group_name_compliance);
router.post('/get_all_produuct_store_compliance', GroupCustomerController.get_all_produuct_store_compliance);

//job_position
router.post('/create_job_position', JobPositionController.create_job_position);
router.post('/job_position/data-table', authenticateJWT, JobPositionController.findAll);
router.post('/get_all_job_position', JobPositionController.get_all_job_position);
router.post('/filter_all_job_position', JobPositionController.filter_all_job_position);

router.get('/get_job_position/:id', JobPositionController.get_job_position_by_id);
router.put('/update_job_position/:id', JobPositionController.update_job_position);
router.put('/update_job_position_isActive/:id', JobPositionController.update_job_position_isActive);

//position
router.post('/create_position', PositionController.create_position);
router.post('/position/data-table', authenticateJWT, PositionController.findAll);
router.post('/get_all_position', PositionController.get_all_position);
router.post('/filter_all_position', PositionController.filter_all_position);

router.get('/get_position/:id', PositionController.get_position_by_id);
router.put('/update_position/:id', PositionController.update_position);
router.put('/update_position_isActive/:id', PositionController.update_position_isActive);

//posm
router.post('/create_posm', PosmController.create_posm);
router.post('/posm/data-table', authenticateJWT, PosmController.findAll);
router.post('/get_all_posm', PosmController.get_all_posm);
router.get('/get_posm/:id', PosmController.get_posm_by_id);
router.put('/update_posm/:id', PosmController.update_posm);
router.put('/update_posm_isActive/:id', PosmController.update_posm_isActive);
router.post('/get_all_posm_filter', PosmController.get_all_posm_filter);
router.post('/get_all_product_filter', PosmController.get_all_product_filter);
router.post('/get_all_product_filter2', PosmController.get_all_product_filter2);

//promotion
router.post('/create_promotion', PromotionController.create_promotion);
router.post('/promotion/data-table', authenticateJWT, PromotionController.findAll);
router.post('/get_all_promotion', PromotionController.get_all_promotion);
router.get('/get_promotion/:id', PromotionController.get_promotion_by_id);
router.put('/update_promotion/:id', PromotionController.update_promotion);
router.put('/update_promotion_isActive/:id', PromotionController.update_promotion_isActive);

//provinces
router.post('/create_provinces', ProvincesController.create_provinces);
router.post('/provinces/data-table', authenticateJWT, ProvincesController.findAll);
router.get('/get_all_provinces', ProvincesController.get_all_provinces);
router.get('/get_provinces/:id', ProvincesController.get_provinces_by_id);
router.put('/update_provinces/:id', ProvincesController.update_provinces);
router.put('/update_provinces_isActive/:id', ProvincesController.update_provinces_isActive);

//reason
router.post('/create_reason', ReasonForNotGettingSpaceController.create_reason);
router.post('/reason/data-table', authenticateJWT, ReasonForNotGettingSpaceController.findAll);
router.post('/get_all_reason', ReasonForNotGettingSpaceController.get_all_reason);
router.get('/get_reason/:id', ReasonForNotGettingSpaceController.get_reason_by_id);
router.put('/update_reason/:id', ReasonForNotGettingSpaceController.update_reason);
router.put('/update_reason_isActive/:id', ReasonForNotGettingSpaceController.update_reason_isActive);
router.post('/get_all_reason_filter', ReasonForNotGettingSpaceController.get_all_reason_filter);

//rental_area_unit
router.post('/create_rental_area_unit', RentalAreaUnitController.create_rental_area_unit);
router.post('/rental_area_unit/data-table', authenticateJWT, RentalAreaUnitController.findAll);
router.post('/get_all_rental_area_unit', RentalAreaUnitController.get_all_rental_area_unit);
router.post('/get_all_rental_area_unit_n', RentalAreaUnitController.get_all_rental_area_unit_n);
router.get('/get_rental_area_unit/:id', RentalAreaUnitController.get_rental_area_unit_by_id);
router.put('/update_rental_area_unit/:id', RentalAreaUnitController.update_rental_area_unit);
router.put('/update_rental_area_unit_isActive/:id', RentalAreaUnitController.update_rental_area_unit_isActive);
router.post('/get_all_rental_area_unit_groupname', RentalAreaUnitController.get_all_rental_area_unit_groupname);
router.post('/get_unit', RentalAreaUnitController.get_unit);
router.post('/get_unit2', RentalAreaUnitController.get_unit2);

//store
router.post('/create_store', StoreController.create_store);
router.post('/store/data-table', authenticateJWT, StoreController.findAll);
router.post('/get_all_store', StoreController.get_all_store);
router.get('/get_store/:id', StoreController.get_store_by_id);
router.put('/update_store/:id', StoreController.update_store);
router.put('/update_store_isActive/:id', StoreController.update_store_isActive);
router.post('/get_store_for_report', StoreController.get_store_for_report);
router.post('/get_all_store_user', StoreController.get_all_store_user);
router.post('/get_all_store_user2', StoreController.get_all_store_user2);

router.post('/get_group_name', StoreController.get_group_name);
router.post('/get_group_name2', StoreController.get_group_name2);

//store_to_account
router.post('/create_store_to_account', StoreToAccountController.create_store_to_account);
router.post('/store_to_account/data-table', authenticateJWT, StoreToAccountController.findAll);
router.post('/get_all_store_to_account', StoreToAccountController.get_all_store_to_account);
router.get('/get_store_to_account/:id', StoreToAccountController.get_store_to_account_by_id);
router.put('/update_store_to_account/:id', StoreToAccountController.update_store_to_account);
router.put('/update_store_to_account_isActive/:id', StoreToAccountController.update_store_to_account_isActive);

//sub_brand
router.post('/create_sub_brand', SubBrandController.create_sub_brand);
router.post('/sub_brand/data-table', authenticateJWT, SubBrandController.findAll);
router.post('/get_all_sub_brand', SubBrandController.get_all_sub_brand);
router.get('/get_sub_brand/:id', SubBrandController.get_sub_brand_by_id);
router.put('/update_sub_brand/:id', SubBrandController.update_sub_brand);
router.put('/update_sub_brand_isActive/:id', SubBrandController.update_sub_brand_isActive);

//new_product
router.post('/create_new_product', NewProductController.create_new_product);
router.post('/new_product/data-table', authenticateJWT, NewProductController.findAll);
router.get('/get_all_new_product', NewProductController.get_all_new_product);
router.get('/get_new_product/:id', NewProductController.get_new_product_by_id);
router.put('/update_new_product/:id', NewProductController.update_new_product);
router.put('/update_new_product_isActive/:id', NewProductController.update_new_product_isActive);

//PlacementPoint
router.post('/create_PlacementPoint', PlacementPointController.create_PlacementPoint);
router.post('/PlacementPoint/data-table', authenticateJWT, PlacementPointController.findAll);
router.post('/get_all_PlacementPoint', PlacementPointController.get_all_PlacementPoint);
router.get('/get_PlacementPoint/:id', PlacementPointController.get_PlacementPoint_by_id);
router.put('/update_PlacementPoint/:id', PlacementPointController.update_PlacementPoint);
router.put('/update_PlacementPoint_isActive/:id', PlacementPointController.update_PlacementPoint_isActive);

//MapProductStore
router.post('/create_MapProductStore', MapProductStoreController.create_MapProductStore);
router.post('/MapProductStore/data-table', authenticateJWT, MapProductStoreController.findAll);
router.post('/get_all_MapProductStore', MapProductStoreController.get_all_MapProductStore);
router.get('/get_MapProductStore/:id', MapProductStoreController.get_MapProductStore_by_id);
router.put('/update_MapProductStore/:id', MapProductStoreController.update_MapProductStore);
router.put('/update_MapProductStore_isActive/:id', MapProductStoreController.update_MapProductStore_isActive);
router.put('/delete_MapProductStore/:id', MapProductStoreController.delete_MapProductStore);
router.post('/get_all_MapProductStore_filter', MapProductStoreController.get_all_MapProductStore_filter);

//MapProductStoreList
router.post('/create_MapProductStoreList', MapProductStoreListController.create_MapProductStoreList);
router.post('/createOrUpdate_MapProductStoreList', MapProductStoreListController.createOrUpdate_MapProductStoreList);
router.post('/MapProductStoreList/data-table', authenticateJWT, MapProductStoreListController.findAll);
router.get('/get_all_MapProductStoreList', MapProductStoreListController.get_all_MapProductStoreList);
router.post('/get_all_MapProductStoreList_filter', MapProductStoreListController.get_all_MapProductStoreList_filter);
router.get('/get_MapProductStoreList/:id', MapProductStoreListController.get_MapProductStoreList_by_id);
router.put('/update_MapProductStoreList/:id', MapProductStoreListController.update_MapProductStoreList);
router.put('/update_MapProductStoreList_isActive/:id', MapProductStoreListController.update_MapProductStoreList_isActive);
router.post('/del_MapProductStore', MapProductStoreListController.del_MapProductStore);

//Oos
router.post('/create_Oos', OosController.create_Oos);
router.post('/Oos/data-table', authenticateJWT, OosController.findAll);
router.post('/get_all_Oos', OosController.get_all_Oos);
router.post('/get_all_Oos_first', OosController.get_all_Oos_first);

router.get('/get_Oos/:id', OosController.get_Oos_by_id);
router.put('/update_Oos/:id', OosController.update_Oos);
router.put('/update_Oos_isActive/:id', OosController.update_Oos_isActive);
router.put('/delete_Oos/:id', OosController.delete_Oos);
router.post('/get_all_Oos_date', OosController.get_all_Oos_date);
router.post('/create_oos2', OosController.create_oos2);

//OosList
router.post('/create_OosList', OosListController.create_OosList);
router.post('/createOrUpdate_OosList', OosListController.createOrUpdate_OosList);
router.post('/OosList/data-table', authenticateJWT, OosListController.findAll);
router.get('/get_all_OosList', OosListController.get_all_OosList);
router.post('/get_all_OosList_filter', OosListController.get_all_OosList_filter);
router.get('/get_OosList/:id', OosListController.get_OosList_by_id);
router.put('/update_OosList/:id', OosListController.update_OosList);
router.put('/update_OosList_isActive/:id', OosListController.update_OosList_isActive);

//MapUserStore
router.post('/create_MapUserStore', MapUserStoreController.create_MapUserStore);
router.post('/MapUserStore/data-table', authenticateJWT, MapUserStoreController.findAll);
router.post('/get_all_MapUserStore', MapUserStoreController.get_all_MapUserStore);
router.get('/get_MapUserStore/:id', MapUserStoreController.get_MapUserStore_by_id);
router.put('/update_MapUserStore/:id', MapUserStoreController.update_MapUserStore);
router.put('/update_MapUserStore_isActive/:id', MapUserStoreController.update_MapUserStore_isActive);

//MapUserArea
router.post('/create_MapUserArea', MapUserAreaController.create_MapUserArea);
router.post('/MapUserArea/data-table', authenticateJWT, MapUserAreaController.findAll);
router.post('/get_all_MapUserArea', MapUserAreaController.get_all_MapUserArea);
router.get('/get_MapUserArea/:id', MapUserAreaController.get_MapUserArea_by_id);
router.put('/update_MapUserArea/:id', MapUserAreaController.update_MapUserArea);
router.put('/update_MapUserArea_isActive/:id', MapUserAreaController.update_MapUserArea_isActive);

//PricePromotion
router.post('/create_PricePromotion', PricePromotionController.create_PricePromotion);
router.post('/create_PricePromotion2', PricePromotionController.create_PricePromotion2);

router.post('/PricePromotion/data-table', authenticateJWT, PricePromotionController.findAll);
router.post('/get_all_PricePromotion', PricePromotionController.get_all_PricePromotion);
router.post('/get_all_PricePromotion_date', PricePromotionController.get_all_PricePromotion_date);
router.post('/get_all_PricePromotion_first', PricePromotionController.get_all_PricePromotion_first);

router.get('/get_PricePromotion/:id', PricePromotionController.get_PricePromotion_by_id);
router.put('/update_PricePromotion/:id', PricePromotionController.update_PricePromotion);
router.put('/update_PricePromotion_isActive/:id', PricePromotionController.update_PricePromotion_isActive);
router.put('/delete_PricePromotion/:id', PricePromotionController.delete_PricePromotion);
router.post('/create_new_PricePromotion', PricePromotionController.create_new_PricePromotion);
router.post('/create_new_PricePromotion2', PricePromotionController.create_new_PricePromotion2);
router.post('/get_price_check_day', PricePromotionController.get_price_check_day);
router.post('/get_all_areadata', PricePromotionController.get_all_areadata);

//PricePromotionList
router.post('/create_PricePromotionList', PricePromotionListController.create_PricePromotionList);
router.post('/createOrUpdate_PricePromotionList', PricePromotionListController.createOrUpdate_PricePromotionList);
router.post('/createOrUpdate_PricePromotionList_dup', PricePromotionListController.createOrUpdate_PricePromotionList_dup);

router.post('/PricePromotionList/data-table', authenticateJWT, PricePromotionListController.findAll);
router.get('/get_all_PricePromotionList', PricePromotionListController.get_all_PricePromotionList);
router.post('/get_all_PricePromotionList_filter', PricePromotionListController.get_all_PricePromotionList_filter);
router.get('/get_PricePromotionList/:id', PricePromotionListController.get_PricePromotionList_by_id);
router.put('/update_PricePromotionList/:id', PricePromotionListController.update_PricePromotionList);
router.put('/update_PricePromotionList_isActive/:id', PricePromotionListController.update_PricePromotionList_isActive);
router.post('/delete_image_price', PricePromotionListController.delete_image_price);

//Week
router.post('/create_Week', WeekController.create_Week);
router.post('/Week/data-table', authenticateJWT, WeekController.findAll);
router.post('/get_all_Week', WeekController.get_all_Week);
router.post('/get_all_week_first', WeekController.get_all_week_first);

router.get('/get_Week/:id', WeekController.get_Week_by_id);
router.put('/update_Week/:id', WeekController.update_Week);
router.put('/update_Week_isActive/:id', WeekController.update_Week_isActive);
router.put('/delete_Week/:id', WeekController.delete_Week);
router.post('/get_all_week_date', WeekController.get_all_week_date);
router.post('/create_Week2', WeekController.create_Week2);

//WeekList
router.post('/create_WeekList', WeekListController.create_WeekList);
router.post('/createOrUpdate_weekList', WeekListController.createOrUpdate_weekList);
router.post('/WeekList/data-table', authenticateJWT, WeekListController.findAll);
router.get('/get_all_WeekList', WeekListController.get_all_WeekList);
router.post('/get_all_WeekList_filter', WeekListController.get_all_WeekList_filter);
router.get('/get_WeekList/:id', WeekListController.get_WeekList_by_id);
router.put('/update_WeekList/:id', WeekListController.update_WeekList);
router.put('/update_WeekList_isActive/:id', WeekListController.update_WeekList_isActive);
router.post('/createOrUpdate_WeekList_dup', WeekListController.createOrUpdate_WeekList_dup);

//Noteoosstock
router.post('/create_Noteoosstock', NoteoosstockController.create_Noteoosstock);
router.post('/Noteoosstock/data-table', authenticateJWT, NoteoosstockController.findAll);
router.post('/get_all_Noteoosstock', NoteoosstockController.get_all_Noteoosstock);
router.get('/get_Noteoosstock/:id', NoteoosstockController.get_Noteoosstock_by_id);
router.put('/update_Noteoosstock/:id', NoteoosstockController.update_Noteoosstock);
router.put('/update_Noteoosstock_isActive/:id', NoteoosstockController.update_Noteoosstock_isActive);
router.post('/get_all_Noteoosstock_filter', NoteoosstockController.get_all_Noteoosstock_filter);

//Offtake
router.post('/create_Offtake', OfftakeController.create_Offtake);
router.post('/Offtake/data-table', authenticateJWT, OfftakeController.findAll);
router.post('/get_all_Offtake', OfftakeController.get_all_Offtake);
router.post('/get_all_Offtake_first', OfftakeController.get_all_Offtake_first);

router.get('/get_Offtake/:id', OfftakeController.get_Offtake_by_id);
router.put('/update_Offtake/:id', OfftakeController.update_Offtake);
router.put('/update_Offtake_isActive/:id', OfftakeController.update_Offtake_isActive);
router.put('/delete_Offtake/:id', OfftakeController.delete_Offtake);
router.post('/get_all_Offtake_date', OfftakeController.get_all_Offtake_date);
router.post('/create_Offtake2', OfftakeController.create_Offtake2);

//OfftakeList
router.post('/create_OfftakeList', OfftakeListController.create_OfftakeList);
router.post('/createOrUpdate_OfftakeList', OfftakeListController.createOrUpdate_OfftakeList);
router.post('/OfftakeList/data-table', authenticateJWT, OfftakeListController.findAll);
router.get('/get_all_OfftakeList', OfftakeListController.get_all_OfftakeList);
router.post('/get_all_OfftakeList_filter', OfftakeListController.get_all_OfftakeList_filter);
router.get('/get_OfftakeList/:id', OfftakeListController.get_OfftakeList_by_id);
router.put('/update_OfftakeList/:id', OfftakeListController.update_OfftakeList);
router.put('/update_OfftakeList_isActive/:id', OfftakeListController.update_OfftakeList_isActive);


//Compliance
router.post('/create_Compliance', ComplianceController.create_Compliance);
router.post('/create_Compliance2', ComplianceController.create_Compliance2);

router.post('/Compliance/data-table', authenticateJWT, ComplianceController.findAll);
router.post('/get_all_Compliance', ComplianceController.get_all_Compliance);
router.post('/get_all_Compliance_date', ComplianceController.get_all_Compliance_date);
router.post('/get_all_Compliance_date2', ComplianceController.get_all_Compliance_date2);
router.post('/get_all_Compliance2', ComplianceController.get_all_Compliance2);

router.get('/get_Compliance/:id', ComplianceController.get_Compliance_by_id);
router.put('/update_Compliance/:id', ComplianceController.update_Compliance);
router.put('/update_Compliance_isActive/:id', ComplianceController.update_Compliance_isActive);
router.put('/delete_Compliance/:id', ComplianceController.delete_Compliance);
router.post('/create_new_Compliance', ComplianceController.create_new_Compliance);
router.post('/create_new_Compliance2', ComplianceController.create_new_Compliance2);
router.post('/get_price_check_day', ComplianceController.get_price_check_day);
router.post('/readdata_Compliance', ComplianceController.readdata_Compliance);
router.post('/delete_ComplianceList', ComplianceController.delete_ComplianceList);
router.post('/delete_MapComplianceList', ComplianceController.delete_MapComplianceList);
router.post('/delete_ComplianceListExtra', ComplianceController.delete_ComplianceListExtra);

//ComplianceList
router.post('/create_ComplianceList', ComplianceListController.create_ComplianceList);
router.post('/createOrUpdate_ComplianceList', ComplianceListController.createOrUpdate_ComplianceList);
router.post('/createOrUpdate_ComplianceListExtra', ComplianceListController.createOrUpdate_ComplianceListExtra);
router.post('/createOrUpdate_ComplianceListExtraImage', ComplianceListController.createOrUpdate_ComplianceListExtraImage);
router.post('/save_all_ComplianceListExtra', upload, ComplianceListController.saveAllComplianceListExtra);

router.post('/ComplianceList/data-table', authenticateJWT, ComplianceListController.findAll);
router.get('/get_all_ComplianceList', ComplianceListController.get_all_ComplianceList);
router.post('/get_all_ComplianceList_filter', ComplianceListController.get_all_ComplianceList_filter);
router.get('/get_ComplianceList/:id', ComplianceListController.get_ComplianceList_by_id);
router.put('/update_ComplianceList/:id', ComplianceListController.update_ComplianceList);
router.put('/update_ComplianceList_isActive/:id', ComplianceListController.update_ComplianceList_isActive);
router.post('/updateOnlyComplianceList', ComplianceListController.updateOnlyComplianceList);

router.post('/complianceDetailsdeleteImage', ComplianceListController.complianceDetailsdeleteImage);
router.post('/complianceDetailsdeleteImageExtra', ComplianceListController.complianceDetailsdeleteImageExtra);

// router.post('/auth/me', authenticateJWT, AdminController.me);
// router.post('/auth/logout', authenticateJWT, AdminController.logout);

//MapStoreCompliance
router.post('/create_MapStoreCompliance', MapStoreComplianceController.create_MapStoreCompliance);
router.post('/MapStoreCompliance/data-table', authenticateJWT, MapStoreComplianceController.findAll);
router.post('/get_all_MapStoreCompliance', MapStoreComplianceController.get_all_MapStoreCompliance);
router.get('/get_MapStoreCompliance/:id', MapStoreComplianceController.get_MapStoreCompliance_by_id);
router.put('/update_MapStoreCompliance/:id', MapStoreComplianceController.update_MapStoreCompliance);
router.put('/update_MapStoreCompliance_isActive/:id', MapStoreComplianceController.update_MapStoreCompliance_isActive);
router.put('/delete_MapStoreCompliance/:id', MapStoreComplianceController.delete_MapStoreCompliance);
router.post('/get_all_MapStoreCompliance_filter', MapStoreComplianceController.get_all_MapStoreCompliance_filter);

//MapStoreComplianceList
router.post('/create_MapStoreComplianceList', MapStoreComplianceListController.create_MapStoreComplianceList);
router.post('/createOrUpdate_MapStoreComplianceList', MapStoreComplianceListController.createOrUpdate_MapStoreComplianceList);
router.post('/MapStoreComplianceList/data-table', authenticateJWT, MapStoreComplianceListController.findAll);
router.get('/get_all_MapStoreComplianceList', MapStoreComplianceListController.get_all_MapStoreComplianceList);
router.post('/get_all_MapStoreComplianceList_filter', MapStoreComplianceListController.get_all_MapStoreComplianceList_filter);
router.get('/get_MapStoreComplianceList/:id', MapStoreComplianceListController.get_MapStoreComplianceList_by_id);
router.put('/update_MapStoreComplianceList/:id', MapStoreComplianceListController.update_MapStoreComplianceList);
router.put('/update_MapStoreComplianceList_isActive/:id', MapStoreComplianceListController.update_MapStoreComplianceList_isActive);
















router.post('/get_all_filters_GroupCustomer', FilterController.get_all_filters_GroupCustomer);
router.post('/get_all_filters', FilterController.get_all_filters);
router.post('/get_all_filters_premium', FilterController.get_all_filters_premium);

router.post('/get_all_filters_Store', FilterController.get_all_filters_Store);
router.post('/get_all_filters_subBrands', FilterController.get_all_filters_subBrands);
router.post('/get_all_filters_products', FilterController.get_all_filters_products);
router.post('/get_all_filters_products_premium', FilterController.get_all_filters_products_premium);

router.post('/get_all_filters_Brands', FilterController.get_all_filters_Brands);
router.post('/get_all_filters_areaManagers', FilterController.get_all_filters_areaManagers);
router.post('/get_all_filters_areaSupervisors', FilterController.get_all_filters_areaSupervisors);
router.post('/get_all_filters_users', FilterController.get_all_filters_users);
router.post('/get_all_filters_account', FilterController.get_all_filters_account);
router.post('/get_all_filters_provinces', FilterController.get_all_filters_provinces);
router.post('/get_all_filters_map', FilterController.get_all_filters_map);
router.post('/get_all_filters_channel', FilterController.get_all_filters_channel);

router.post('/dashboard_oos', DashboardController.dashboard_oos);
router.post('/dashboard_oos_test', DashboardController.dashboard_oos_test);
router.post('/dashboard_stock_test', DashboardController.dashboard_stock_test);
router.post('/dashboard_stock_table', DashboardController.dashboard_stock_table);
router.post('/dashboard_offtake_table', DashboardController.dashboard_offtake_table);
router.post('/dashboard_premium_test', DashboardController.dashboard_premium_test);
router.post('/dashboard_compliance', DashboardController.dashboard_compliance);
router.post('/dashboard_extra', DashboardController.dashboard_extra);
router.post('/areaManagers', DashboardController.areaManagers);
router.post('/areaSupervisor', DashboardController.areaSupervisor);
router.post('/getBrands', DashboardController.getBrands);
router.post('/getBrandsOfftake', DashboardController.getBrandsOfftake);

router.post('/getTableProduct', DashboardController.getTableProduct);
router.post('/getTableProductOfftake', DashboardController.getTableProductOfftake);

router.post('/dashboard_offtake', DashboardController.dashboard_offtake);

router.post('/changepassword', UserController.changepassword);
router.post('/edituser', UserController.edituser);


router.get('/test_update', UserController.test_update);

router.post('/renew_product_oos', AdminController.renew_product_oos);
router.post('/renew_product_offtake', AdminController.renew_product_offtake);
router.post('/renew_product_price', AdminController.renew_product_price);
router.post('/renew_product_week', AdminController.renew_product_week);


// // AdminController
// router.post('/admin', authenticateJWT, AdminController.create);
// router.post('/admin/data-table', authenticateJWT, AdminController.findAll);
// router.put('/admin/:id', validate('id'), authenticateJWT, AdminController.update);
// router.get('/admin/:id', validate('id'), authenticateJWT, AdminController.findOne);
// router.delete('/admin/:id', validate('id'), authenticateJWT, AdminController.delete);
// router.post('/admin/:id/status', validate('id'), authenticateJWT, AdminController.status);

// UserController
// router.post('/user', authenticateJWT, UserController.create);
// router.post('/user/data-table', authenticateJWT, UserController.findAll);
// router.put('/user/:id', validate('id'), authenticateJWT, UserController.update);
// router.get('/user/:id', validate('id'), authenticateJWT, UserController.findOne);
// router.delete('/user/:id', validate('id'), authenticateJWT, UserController.delete);
// router.post('/user/:id/status', validate('id'), authenticateJWT, UserController.status);

// // BannerController
// router.post('/banner', authenticateJWT, BannerController.create);
// router.post('/banner/data-table', BannerController.findAll);
// // router.post('/banner/data-table', authenticateJWT, BannerController.findAll);
// router.put('/banner/:id', validate('id'), authenticateJWT, BannerController.update);
// router.get('/banner/:id', validate('id'), BannerController.findOne);
// router.get('/banner/:id', validate('id'), authenticateJWT, BannerController.findOne);

// router.delete('/banner/:id', validate('id'), authenticateJWT, BannerController.delete);
// router.post('/banner/:id/status', validate('id'), authenticateJWT, BannerController.status);

// // CategoryController
// router.post('/category', authenticateJWT, CategoryController.validate('form'), CategoryController.create);
// router.post('/category/data-table', authenticateJWT, CategoryController.findAll);
// router.put('/category/:id', validate('id'), CategoryController.validate('form'), authenticateJWT, CategoryController.update);
// router.get('/category/:id', validate('id'), authenticateJWT, CategoryController.findOne);
// router.delete('/category/:id', validate('id'), authenticateJWT, CategoryController.delete);
// router.post('/category/:id/status', validate('id'), authenticateJWT, CategoryController.status);

router.post('/admin/tasks', auth, TaskController.createTask);
router.get('/admin/tasks', auth, TaskController.getAdminTasks);

module.exports = router;
