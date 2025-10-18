<?php
define('APP_INIT', true);

require_once __DIR__ . '/security.php';
require_once __DIR__ . '/../database/config.php';

Response::json([
    'test' => 'direct access works',
    'timestamp' => time()
]);
