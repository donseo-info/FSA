<?php
/**
 * Инициализация базы данных для документов
 * Создает таблицы для хранения детальных данных документов
 */

require_once 'database.php';

try {
    // Подключаемся к базе данных
    Database::connect();
    
    echo "🧪 Инициализация базы данных для документов...\n";
    
    // Создаем таблицу для документов
    $createDocumentsTable = "
        CREATE TABLE IF NOT EXISTS documents (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            document_id INTEGER UNIQUE NOT NULL,
            number VARCHAR(255),
            decl_reg_date DATE,
            decl_end_date DATE,
            id_status INTEGER,
            id_technical_reglaments TEXT,
            id_decl_scheme INTEGER,
            id_decl_type INTEGER,
            submission_date DATE,
            last_update DATETIME,
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
            updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
        )
    ";
    
    R::exec($createDocumentsTable);
    echo "✅ Таблица documents создана\n";
    
    // Создаем таблицу для заявителей
    $createApplicantsTable = "
        CREATE TABLE IF NOT EXISTS applicants (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            document_id INTEGER NOT NULL,
            id_legal_subject INTEGER,
            id_person INTEGER,
            full_name TEXT,
            short_name VARCHAR(255),
            surname VARCHAR(255),
            first_name VARCHAR(255),
            patronymic VARCHAR(255),
            head_position VARCHAR(255),
            ogrn VARCHAR(20),
            inn VARCHAR(20),
            kpp VARCHAR(20),
            reg_date DATE,
            reg_organ_name TEXT,
            email VARCHAR(255),
            phone VARCHAR(50),
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
            updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (document_id) REFERENCES documents(document_id)
        )
    ";
    
    R::exec($createApplicantsTable);
    echo "✅ Таблица applicants создана\n";
    
    // Создаем таблицу для изготовителей
    $createManufacturersTable = "
        CREATE TABLE IF NOT EXISTS manufacturers (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            document_id INTEGER NOT NULL,
            id_legal_subject INTEGER,
            full_name TEXT,
            short_name VARCHAR(255),
            surname VARCHAR(255),
            first_name VARCHAR(255),
            patronymic VARCHAR(255),
            ogrn VARCHAR(20),
            inn VARCHAR(20),
            kpp VARCHAR(20),
            reg_date DATE,
            reg_organ_name TEXT,
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
            updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (document_id) REFERENCES documents(document_id)
        )
    ";
    
    R::exec($createManufacturersTable);
    echo "✅ Таблица manufacturers создана\n";
    
    // Создаем таблицу для продукции
    $createProductsTable = "
        CREATE TABLE IF NOT EXISTS products (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            document_id INTEGER NOT NULL,
            id_product INTEGER,
            full_name TEXT,
            marking TEXT,
            usage_scope TEXT,
            storage_condition TEXT,
            usage_condition TEXT,
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
            updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (document_id) REFERENCES documents(document_id)
        )
    ";
    
    R::exec($createProductsTable);
    echo "✅ Таблица products создана\n";
    
    // Создаем таблицу для испытательных лабораторий
    $createTestingLabsTable = "
        CREATE TABLE IF NOT EXISTS testinglabs (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            document_id INTEGER NOT NULL,
            id_testing_lab INTEGER,
            reg_number VARCHAR(100),
            full_name TEXT,
            begin_date DATE,
            end_date DATE,
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
            updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (document_id) REFERENCES documents(document_id)
        )
    ";
    
    R::exec($createTestingLabsTable);
    echo "✅ Таблица testing_labs создана\n";
    
    // Создаем таблицу для контактов
    $createContactsTable = "
        CREATE TABLE IF NOT EXISTS contacts (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            document_id INTEGER NOT NULL,
            id_contact INTEGER,
            id_contact_type INTEGER,
            value VARCHAR(255),
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
            updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (document_id) REFERENCES documents(document_id)
        )
    ";
    
    R::exec($createContactsTable);
    echo "✅ Таблица contacts создана\n";
    
    // Создаем таблицу для адресов
    $createAddressesTable = "
        CREATE TABLE IF NOT EXISTS addresses (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            document_id INTEGER NOT NULL,
            entity_type VARCHAR(20) NOT NULL, -- 'applicant' или 'manufacturer'
            id_address INTEGER,
            id_addr_type INTEGER,
            id_code_oksm VARCHAR(10),
            full_address TEXT,
            post_code VARCHAR(20),
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
            updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (document_id) REFERENCES documents(document_id)
        )
    ";
    
    R::exec($createAddressesTable);
    echo "✅ Таблица addresses создана\n";
    
    // Создаем индексы для оптимизации
    $indexes = [
        "CREATE INDEX IF NOT EXISTS idx_documents_document_id ON documents(document_id)",
        "CREATE INDEX IF NOT EXISTS idx_documents_number ON documents(number)",
        "CREATE INDEX IF NOT EXISTS idx_documents_status ON documents(id_status)",
        "CREATE INDEX IF NOT EXISTS idx_applicants_document_id ON applicants(document_id)",
        "CREATE INDEX IF NOT EXISTS idx_applicants_email ON applicants(email)",
        "CREATE INDEX IF NOT EXISTS idx_applicants_inn ON applicants(inn)",
        "CREATE INDEX IF NOT EXISTS idx_manufacturers_document_id ON manufacturers(document_id)",
        "CREATE INDEX IF NOT EXISTS idx_products_document_id ON products(document_id)",
        "CREATE INDEX IF NOT EXISTS idx_testinglabs_document_id ON testinglabs(document_id)",
        "CREATE INDEX IF NOT EXISTS idx_contacts_document_id ON contacts(document_id)",
        "CREATE INDEX IF NOT EXISTS idx_addresses_document_id ON addresses(document_id)"
    ];
    
    foreach ($indexes as $index) {
        R::exec($index);
    }
    echo "✅ Индексы созданы\n";
    
    // Создаем таблицу для логов
    $createLogsTable = "
        CREATE TABLE IF NOT EXISTS documents_logs (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            level VARCHAR(20) NOT NULL,
            message TEXT NOT NULL,
            context TEXT,
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP
        )
    ";
    
    R::exec($createLogsTable);
    echo "✅ Таблица documents_logs создана\n";
    
    echo "\n🎉 База данных для документов успешно инициализирована!\n";
    echo "📊 Созданы таблицы:\n";
    echo "   - documents (основная информация о декларациях)\n";
    echo "   - applicants (заявители)\n";
    echo "   - manufacturers (изготовители)\n";
    echo "   - products (продукция)\n";
    echo "   - testing_labs (испытательные лаборатории)\n";
    echo "   - contacts (контакты)\n";
    echo "   - addresses (адреса)\n";
    echo "   - documents_logs (логи)\n";
    
} catch (Exception $e) {
    echo "❌ Ошибка инициализации базы данных: " . $e->getMessage() . "\n";
    exit(1);
}
?>
