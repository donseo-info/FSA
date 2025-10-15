<?php
/**
 * Упрощенный гейт для сохранения данных документов
 * Использует RedBean ORM для работы с базой данных
 */

header('Content-Type: application/json; charset=utf-8');
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: POST, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type');

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200);
    exit();
}

require_once 'database.php';

function logMessage($message, $level = 'INFO') {
    $timestamp = date('Y-m-d H:i:s');
    $logMessage = "[{$timestamp}] [{$level}] {$message}" . PHP_EOL;
    error_log($logMessage, 3, __DIR__ . '/documents_gate.log');
}

function sendResponse($success, $message, $data = null, $httpCode = 200) {
    http_response_code($httpCode);
    echo json_encode([
        'success' => $success,
        'message' => $message,
        'data' => $data,
        'timestamp' => date('Y-m-d H:i:s')
    ], JSON_UNESCAPED_UNICODE);
    exit();
}

try {
    if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
        sendResponse(false, 'Только POST запросы разрешены', null, 405);
    }

    $input = file_get_contents('php://input');
    $data = json_decode($input, true);

    if (json_last_error() !== JSON_ERROR_NONE) {
        sendResponse(false, 'Ошибка парсинга JSON: ' . json_last_error_msg(), null, 400);
    }

    // Проверяем новую структуру данных
    if (!isset($data['documents']) || !isset($data['documents']['idDeclaration'])) {
        sendResponse(false, 'Поле "documents.idDeclaration" обязательно', null, 400);
    }

    $documentId = (int)$data['documents']['idDeclaration'];
    logMessage("Получен запрос на сохранение документа ID: {$documentId}");

    // Подключаемся к базе данных документов
    Database::setDbPath('sqlite:documents.db');
    Database::connect();

    // Начинаем транзакцию
    R::begin();

    try {
        // Проверяем, существует ли уже документ
        $existingDoc = R::findOne('documents', 'document_id = ?', [$documentId]);
        
        if ($existingDoc) {
            logMessage("Документ {$documentId} уже существует, обновляем данные", 'INFO');
            $isUpdate = true;
            $document = $existingDoc;
        } else {
            logMessage("Создаем новый документ {$documentId}", 'INFO');
            $isUpdate = false;
            $document = R::dispense('documents');
        }

        // Сохраняем основную информацию о документе из новой структуры
        $docData = $data['documents'];
        $document->document_id = $documentId;
        $document->number = $docData['number'] ?? null;
        $document->decl_reg_date = $docData['declRegDate'] ?? null;
        $document->decl_end_date = $docData['declEndDate'] ?? null;
        $document->id_status = $docData['idStatus'] ?? null;
        $document->id_technical_reglaments = json_encode($data['idTechnicalReglaments'] ?? []);
        $document->id_decl_scheme = $docData['idDeclScheme'] ?? null;
        $document->id_decl_type = $docData['idDeclType'] ?? null;
        $document->id_object_decl_type = $docData['idObjectDeclType'] ?? null;
        $document->submission_date = $docData['submissionDate'] ?? null;
        $document->last_update = $docData['lastUpdate'] ?? null;
        $document->first_name = $docData['firstName'] ?? null;
        $document->surname = $docData['surname'] ?? null;
        $document->patronymic = $docData['patronymic'] ?? null;
        $document->updated_at = date('Y-m-d H:i:s');

        if (!$isUpdate) {
            $document->created_at = date('Y-m-d H:i:s');
        }

        $docId = R::store($document);

        // Удаляем старые связанные данные
        R::exec('DELETE FROM applicants WHERE document_id = ?', [$documentId]);
        R::exec('DELETE FROM manufacturers WHERE document_id = ?', [$documentId]);
        R::exec('DELETE FROM products WHERE document_id = ?', [$documentId]);
        R::exec('DELETE FROM testinglabs WHERE document_id = ?', [$documentId]);
        R::exec('DELETE FROM contacts WHERE document_id = ?', [$documentId]);
        R::exec('DELETE FROM addresses WHERE document_id = ?', [$documentId]);

        // Сохраняем данные заявителя (если есть)
        if (isset($data['applicant']) && $data['applicant'] && is_array($data['applicant'])) {
            logMessage("Сохраняем данные заявителя для документа {$documentId}", 'INFO');
            $applicant = R::dispense('applicants');
            $applicant->document_id = $documentId;
            $applicant->id_legal_subject = $data['applicant']['idLegalSubject'] ?? null;
            $applicant->id_person = $data['applicant']['idPerson'] ?? null;
            $applicant->full_name = $data['applicant']['fullName'] ?? null;
            $applicant->short_name = $data['applicant']['shortName'] ?? null;
            $applicant->surname = $data['applicant']['surname'] ?? null;
            $applicant->first_name = $data['applicant']['firstName'] ?? null;
            $applicant->patronymic = $data['applicant']['patronymic'] ?? null;
            $applicant->head_position = $data['applicant']['headPosition'] ?? null;
            $applicant->ogrn = $data['applicant']['ogrn'] ?? null;
            $applicant->inn = $data['applicant']['inn'] ?? null;
            $applicant->kpp = $data['applicant']['kpp'] ?? null;
            $applicant->reg_date = $data['applicant']['regDate'] ?? null;
            $applicant->reg_organ_name = $data['applicant']['regOrganName'] ?? null;
            $applicant->email = $data['applicant']['email'] ?? null;
            $applicant->phone = $data['applicant']['phone'] ?? null;
            $applicant->created_at = date('Y-m-d H:i:s');
            $applicant->updated_at = date('Y-m-d H:i:s');
            R::store($applicant);
            logMessage("Данные заявителя сохранены для документа {$documentId}", 'SUCCESS');
        } else {
            logMessage("Данные заявителя отсутствуют для документа {$documentId}", 'WARN');
        }

        // Сохраняем данные изготовителя (если есть)
        if (isset($data['manufacturer']) && $data['manufacturer'] && is_array($data['manufacturer'])) {
            logMessage("Сохраняем данные изготовителя для документа {$documentId}", 'INFO');
            $manufacturer = R::dispense('manufacturers');
            $manufacturer->document_id = $documentId;
            $manufacturer->id_legal_subject = $data['manufacturer']['idLegalSubject'] ?? null;
            $manufacturer->full_name = $data['manufacturer']['fullName'] ?? null;
            $manufacturer->short_name = $data['manufacturer']['shortName'] ?? null;
            $manufacturer->surname = $data['manufacturer']['surname'] ?? null;
            $manufacturer->first_name = $data['manufacturer']['firstName'] ?? null;
            $manufacturer->patronymic = $data['manufacturer']['patronymic'] ?? null;
            $manufacturer->ogrn = $data['manufacturer']['ogrn'] ?? null;
            $manufacturer->inn = $data['manufacturer']['inn'] ?? null;
            $manufacturer->kpp = $data['manufacturer']['kpp'] ?? null;
            $manufacturer->reg_date = $data['manufacturer']['regDate'] ?? null;
            $manufacturer->reg_organ_name = $data['manufacturer']['regOrganName'] ?? null;
            $manufacturer->created_at = date('Y-m-d H:i:s');
            $manufacturer->updated_at = date('Y-m-d H:i:s');
            R::store($manufacturer);
            logMessage("Данные изготовителя сохранены для документа {$documentId}", 'SUCCESS');
        } else {
            logMessage("Данные изготовителя отсутствуют для документа {$documentId}", 'WARN');
        }

        // Сохраняем данные продукции (если есть)
        if (isset($data['product']) && $data['product'] && is_array($data['product'])) {
            logMessage("Сохраняем данные продукции для документа {$documentId}", 'INFO');
            $product = R::dispense('products');
            $product->document_id = $documentId;
            $product->id_product = $data['product']['idProduct'] ?? null;
            $product->name = $data['product']['name'] ?? null;
            $product->id_product_type = $data['product']['idProductType'] ?? null;
            $product->id_product_origin = $data['product']['idProductOrigin'] ?? null;
            $product->id_product_ru = $data['product']['idProductRU'] ?? null;
            $product->id_product_eeu = $data['product']['idProductEEU'] ?? null;
            $product->created_at = date('Y-m-d H:i:s');
            $product->updated_at = date('Y-m-d H:i:s');
            R::store($product);
            logMessage("Данные продукции сохранены для документа {$documentId}", 'SUCCESS');
        } else {
            logMessage("Данные продукции отсутствуют для документа {$documentId}", 'WARN');
        }

        // Сохраняем данные испытательных лабораторий (если есть)
        if (isset($data['testingLabs']) && is_array($data['testingLabs']) && count($data['testingLabs']) > 0) {
            logMessage("Сохраняем данные лабораторий для документа {$documentId}", 'INFO');
            foreach ($data['testingLabs'] as $labData) {
                $lab = R::dispense('testinglabs');
                $lab->document_id = $documentId;
                $lab->id_testing_lab = $labData['idTestingLab'] ?? null;
                $lab->reg_number = $labData['regNumber'] ?? null;
                $lab->full_name = $labData['fullName'] ?? null;
                $lab->begin_date = $labData['beginDate'] ?? null;
                $lab->end_date = $labData['endDate'] ?? null;
                $lab->created_at = date('Y-m-d H:i:s');
                $lab->updated_at = date('Y-m-d H:i:s');
                R::store($lab);
            }
            logMessage("Данные лабораторий сохранены для документа {$documentId}", 'SUCCESS');
        } else {
            logMessage("Данные лабораторий отсутствуют для документа {$documentId}", 'WARN');
        }

        // Сохраняем контакты (если есть)
        if (isset($data['contacts']) && is_array($data['contacts']) && count($data['contacts']) > 0) {
            logMessage("Сохраняем контакты для документа {$documentId}", 'INFO');
            foreach ($data['contacts'] as $contactData) {
                $contact = R::dispense('contacts');
                $contact->document_id = $documentId;
                $contact->id_contact = $contactData['idContact'] ?? null;
                $contact->id_contact_type = $contactData['idContactType'] ?? null;
                $contact->value = $contactData['value'] ?? null;
                $contact->created_at = date('Y-m-d H:i:s');
                $contact->updated_at = date('Y-m-d H:i:s');
                R::store($contact);
            }
            logMessage("Контакты сохранены для документа {$documentId}", 'SUCCESS');
        } else {
            logMessage("Контакты отсутствуют для документа {$documentId}", 'WARN');
        }

        // Сохраняем адреса (если есть)
        if (isset($data['addresses']) && is_array($data['addresses']) && count($data['addresses']) > 0) {
            logMessage("Сохраняем адреса для документа {$documentId}", 'INFO');
            foreach ($data['addresses'] as $addressData) {
                $address = R::dispense('addresses');
                $address->document_id = $documentId;
                $address->entity_type = 'document';
                $address->id_address = $addressData['idAddress'] ?? null;
                $address->id_addr_type = $addressData['idAddrType'] ?? null;
                $address->id_code_oksm = $addressData['idCodeOksm'] ?? null;
                $address->full_address = $addressData['fullAddress'] ?? null;
                $address->post_code = $addressData['postCode'] ?? null;
                $address->created_at = date('Y-m-d H:i:s');
                $address->updated_at = date('Y-m-d H:i:s');
                R::store($address);
            }
            logMessage("Адреса сохранены для документа {$documentId}", 'SUCCESS');
        } else {
            logMessage("Адреса отсутствуют для документа {$documentId}", 'WARN');
        }

        // Подтверждаем транзакцию
        R::commit();

        $result = [
            'document_id' => $documentId,
            'action' => $isUpdate ? 'updated' : 'created',
            'timestamp' => date('Y-m-d H:i:s')
        ];

        logMessage("Документ {$documentId} успешно " . ($isUpdate ? 'обновлен' : 'создан'), 'SUCCESS');
        sendResponse(true, "Документ успешно " . ($isUpdate ? 'обновлен' : 'сохранен'), $result);

    } catch (Exception $e) {
        R::rollback();
        logMessage("Ошибка транзакции: " . $e->getMessage(), 'ERROR');
        sendResponse(false, "Ошибка сохранения документа: " . $e->getMessage(), null, 500);
    }

} catch (Exception $e) {
    logMessage("Критическая ошибка: " . $e->getMessage(), 'ERROR');
    sendResponse(false, "Внутренняя ошибка сервера: " . $e->getMessage(), null, 500);
}
?>
