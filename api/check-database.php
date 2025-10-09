<?php
/**
 * Check Database Tables
 */

define('APP_INIT', true);

// Set environment variables
putenv('DB_HOST=localhost');
putenv('DB_PORT=3306');
putenv('DB_NAME=iptv_manager');
putenv('DB_USER=iptv_app');
putenv('DB_PASS=IptvManager2025!Secure');

require_once __DIR__ . '/../database/config.php';

try {
    $conn = getDbConnection();
    
    echo "Database connection successful!\n";
    
    // Check if invoices table exists
    $result = $conn->query("SHOW TABLES LIKE 'invoices'");
    $tables = $result->fetchAll(PDO::FETCH_COLUMN);
    
    if (in_array('invoices', $tables)) {
        echo "✅ Table 'invoices' exists\n";
        
        // Check table structure
        $result = $conn->query("DESCRIBE invoices");
        echo "Table structure:\n";
        while ($row = $result->fetch(PDO::FETCH_ASSOC)) {
            echo "- " . $row['Field'] . " (" . $row['Type'] . ")\n";
        }
        
        // Check if there are any records
        $result = $conn->query("SELECT COUNT(*) as count FROM invoices");
        $count = $result->fetch(PDO::FETCH_ASSOC)['count'];
        echo "Records in invoices table: " . $count . "\n";
        
    } else {
        echo "❌ Table 'invoices' does NOT exist\n";
        
        // Show all tables
        $result = $conn->query("SHOW TABLES");
        echo "Available tables:\n";
        while ($row = $result->fetch(PDO::FETCH_ASSOC)) {
            echo "- " . $row['Tables_in_iptv_manager'] . "\n";
        }
    }
    
} catch (Exception $e) {
    echo "❌ Database error: " . $e->getMessage() . "\n";
}
