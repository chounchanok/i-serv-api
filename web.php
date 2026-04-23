<?php

use Illuminate\Support\Facades\Route;

/*
|--------------------------------------------------------------------------
| Web Routes
|--------------------------------------------------------------------------
|
| Here is where you can register web routes for your application. These
| routes are loaded by the RouteServiceProvider within a group which
| contains the "web" middleware group. Now create something great!
|
*/

Route::get('/line-notification', 'LineController@index')->name('line-notification');
Route::get('/line_callback', 'LineController@line_callback')->name('line_callback');

Route::get('/connect-line', 'LineController@connect_line')->name('connect-line');
Route::post('/beacon-checkin', 'BeaconController@checkIn')->name('beaconCheckIn');
Route::get('/orange/checkin', 'BeaconController@checkinPage')->name('checkinPage');
Route::get('/orange/checkinSubmit', 'BeaconController@checkinSubmit')->name('checkinSubmit');


Auth::routes([
  'register' => false, 
  'reset' => false, 
  'verify' => false, 
]);

// Route::group(['middleware' => 'auth'], function(){ 

 //    $ipaddress = '';
 //    if (getenv('HTTP_CLIENT_IP'))
 //        $ipaddress = getenv('HTTP_CLIENT_IP');
 //    else if(getenv('HTTP_X_FORWARDED_FOR'))
 //        $ipaddress = getenv('HTTP_X_FORWARDED_FOR');
 //    else if(getenv('HTTP_X_FORWARDED'))
 //        $ipaddress = getenv('HTTP_X_FORWARDED');
 //    else if(getenv('HTTP_FORWARDED_FOR'))
 //        $ipaddress = getenv('HTTP_FORWARDED_FOR');
 //    else if(getenv('HTTP_FORWARDED'))
 //       $ipaddress = getenv('HTTP_FORWARDED');
 //    else if(getenv('REMOTE_ADDR'))
 //        $ipaddress = getenv('REMOTE_ADDR');
 //    else
 //        $ipaddress = 'UNKNOWN';

	// if($ipaddress == '124.120.118.200'){
		Route::get('/', 'HomeController@index')->name('home');
		Route::get('/home', 'HomeController@index')->name('home');

		Route::middleware('cache.headers:public;max_age=0;etag')->group(function () {
			Route::get('/report_all', 'HomeController@report_all')->name('report_all');
			Route::get('/report_all/{team}', 'HomeController@report_team')->name('report_team');
		});
		Route::get('/report_me', 'HomeController@report_me')->name('report_me');
		Route::get('/send_report', 'HomeController@send_report')->name('send_report');
		Route::post('report_new', 'HomeController@report_new')->name('report_new');
		Route::post('check_hour', 'HomeController@check_hour')->name('check_hour');
		Route::post('approve_report', 'HomeController@approve_report')->name('approve_report');
		Route::post('change_status', 'HomeController@change_status')->name('change_status');

		Route::post('report_draft', 'HomeController@report_draft')->name('report_draft');
		Route::post('report_destroy_draft', 'HomeController@report_destroy_draft')->name('report_destroy_draft');

		Route::get('/employee', 'HomeController@employee')->name('employee');
		Route::post('/sort_employee' , 'HomeController@sort_employee')->name('sort_employee');
		Route::get('/employee_del/{id}', 'HomeController@employee_del')->name('employee_del');

		Route::get('/profile', 'HomeController@profile')->name('profile');
		Route::get('/profile/{id}', 'HomeController@view_profile')->name('view_profile');
		Route::get('/edit_profile', 'HomeController@edit_profile')->name('edit_profile');
		Route::post('/profile_edit/{id}', 'HomeController@profile_edit')->name('profile_edit');
		Route::post('/profile_insert' , 'HomeController@profile_insert')->name('profile_insert');
		Route::post('/profile_update' , 'HomeController@profile_update')->name('profile_update');

		Route::get('/birthday', 'HomeController@birthday')->name('birthday');
		Route::post('/setbirthday_employee' , 'HomeController@setbirthday_employee')->name('setbirthday_employee');
		Route::post('/setworkday_employee' , 'HomeController@setworkday_employee')->name('setworkday_employee');


		Route::get('/assign/{id}', 'HomeController@assign')->name('assign');
		Route::post('/assign_update/{id}', 'HomeController@assign_update')->name('assign_update');
		Route::get('/assign_del/{id}','HomeController@assign_del')->name('assign_del');
		Route::get('/clear_count','HomeController@clear_count')->name('clear_count');
		Route::get('/assign_success/{id}', 'HomeController@assign_success')->name('assign_success');

		Route::get('/ot', 'HomeController@overtime')->name('overtime');
		Route::post('get_overtime', 'HomeController@get_overtime')->name('get_overtime');

		Route::get('/history', 'HomeController@history')->name('history');
		Route::get('/search_history/{month}', 'HomeController@search_history')->name('search_history');
		Route::get('/see_more_employee/{step}' , 'HomeController@see_more_employee')->name('see_more_employee');

		// Beacon
		
		Route::get('/beacon-history', 'BeaconController@index')->name('beaconHistory');
		Route::get('/beacon-summary/{id}', 'BeaconController@summary')->name('beaconSummary');


		Route::get('/domain','DomainController@domain')->name('domain');
		Route::get('/domain/{page}','DomainController@domain')->name('domain');
		Route::get('/domain_new','DomainController@domain_new')->name('domain_new');
		Route::post('domain_insert','DomainController@domain_insert')->name('domain_insert');
		Route::get('/domain_edit/{page}/{id}','DomainController@domain_edit')->name('domain_edit');
		Route::post('domain_update','DomainController@domain_update')->name('domain_update');
		Route::get('/domain_delete/{id}','DomainController@domain_delete')->name('domain_delete');
		Route::get('/domain_deleted/{id}','DomainController@domain_deleted')->name('domain_deleted');
		Route::post('update_invoice','DomainController@update_invoice')->name('update_invoice');
		Route::get('/delete_invoice/{id}','DomainController@delete_invoice')->name('delete_invoice');
		Route::get('/get_domainfile/{id}','DomainController@get_domainfile')->name('get_domainfile');
		Route::get('/update_verify/{id}','HomeController@update_verify')->name('update_verify');

		Route::get('/get_domainsize','DomainController@get_domainsize')->name('get_domainsize');
		Route::post('update_size','DomainController@update_size')->name('update_size');
		Route::get('/delete_size/{id}','DomainController@delete_size')->name('delete_size');

		Route::get('/announcement','HomeController@announcement')->name('announcement');
		Route::post('send_announcement','HomeController@send_announcement')->name('send_announcement');
		Route::post('get_birthday','HomeController@get_birthday')->name('get_birthday');

		Route::get('/redirect/iso', 'HomeController@iso')->name('iso');

		// ISO Sync - New Structure
		Route::get('/task/sync-iso', 'HomeController@syncIsoIndex')->name('task.sync.iso');
		Route::post('/task/sync-iso/recalc-progress', 'HomeController@recalcOpenTasksProgress')->name('task.sync.iso.recalc');
		Route::get('/task/sync-iso/project', 'HomeController@syncIsoProject')->name('task.sync.iso.project');
		Route::post('/task/sync-iso/project', 'HomeController@syncIsoProject')->name('task.sync.iso.project.run');
		Route::get('/task/sync-iso/timesheet', 'HomeController@syncIsoLogs')->name('task.sync.iso.timesheet');
		Route::post('/task/sync-iso/timesheet', 'HomeController@syncIsoLogs')->name('task.sync.iso.timesheet.run');
		Route::get('/task/sync-iso/status', 'HomeController@syncIsoStatus')->name('task.sync.iso.status');
Route::post('/task/sync-iso/users', 'HomeController@syncIsoUsers')->name('task.sync.iso.users');
		Route::get('/task/sync-iso/orphan-preview', 'Type3TaskController@getOrphanPreview')->name('task.sync.iso.orphan_preview');
		Route::post('/task/sync-iso/fix-orphan-type3', 'Type3TaskController@fixOrphanAssignments')->name('task.sync.iso.fix_orphan_type3');

		// Backward compatibility
		Route::get('/task/sync-iso-log', 'HomeController@syncIsoLogs')->name('task.sync.iso.log');
		Route::post('/task/sync-iso-log', 'HomeController@syncIsoLogs')->name('task.sync.iso.log.run');
		Route::get('/task/sync-iso-log/status', 'HomeController@getSyncProgressStatus')->name('task.sync.iso.log.status');

		// Task Maintenance (Fix Missing IDs)
		Route::get('/task/fix-missing-id', 'TaskFixController@index')->name('task.fix.index');
		Route::post('/task/fix-missing-id/run', 'TaskFixController@fix')->name('task.fix.run');
		Route::post('/task/fix-missing-id/all', 'TaskFixController@fixAll')->name('task.fix.all');
	// }else{
	// 	Route::get('/','HomeController@maintenance');
	// }

// });

Route::get('/logout', 'HomeController@logout');
