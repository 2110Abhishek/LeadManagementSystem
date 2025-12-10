<?php

use CodeIgniter\Router\RouteCollection;

/**
 * @var RouteCollection $routes
 */
$routes->group('', ['namespace' => 'App\Controllers'], static function ($routes) {
$routes->get('/', 'Home::index');
$routes->get('leads', 'Leads::index');
$routes->put('leads/(:num)', 'Leads::update/$1');
$routes->post("leads/upload-headers", "CsvController::uploadHeaders");
$routes->post("leads/preview", "CsvController::preview");
$routes->post("leads/upload-final", "CsvController::finalUpload");
$routes->delete('leads/(:num)', 'Leads::delete/$1');
});