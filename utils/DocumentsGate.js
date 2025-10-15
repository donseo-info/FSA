/**
 * Класс для работы с гейтом документов
 * Отправляет данные документов в базу данных
 */

export class DocumentsGate {
  constructor(gateUrl, logFunction = console.log) {
    this.gateUrl = gateUrl;
    this.log = logFunction;
  }

  /**
   * Проверяет доступность гейта
   */
  async checkGateHealth() {
    try {
      const response = await fetch(this.gateUrl, {
        method: 'OPTIONS',
        headers: {
          'Content-Type': 'application/json'
        }
      });
      
      return response.ok;
    } catch (error) {
      this.log(`❌ Гейт документов недоступен: ${error.message}`, 'ERROR');
      return false;
    }
  }

  /**
   * Проверяет и валидирует данные документа перед отправкой
   * Сохраняем все доступные данные, даже если некоторые поля отсутствуют
   */
  validateDocumentData(documentData) {
    const validation = {
      isValid: true,
      warnings: [],
      missingFields: [],
      availableData: {
        documents: false,
        applicant: false,
        manufacturer: false,
        product: false,
        testingLabs: false,
        contacts: false,
        addresses: false
      }
    };

    // Проверяем основные поля документа (обязательно)
    if (!documentData.documents || !documentData.documents.idDeclaration) {
      validation.isValid = false;
      validation.missingFields.push('documents.idDeclaration');
    } else {
      validation.availableData.documents = true;
    }

    // Проверяем заявителя (опционально, но если есть - сохраняем)
    if (documentData.applicant && typeof documentData.applicant === 'object') {
      validation.availableData.applicant = true;
      if (!documentData.applicant.fullName) {
        validation.warnings.push('У заявителя отсутствует полное имя');
      }
    } else {
      validation.warnings.push('Данные заявителя отсутствуют');
    }

    // Проверяем изготовителя (опционально)
    if (documentData.manufacturer && typeof documentData.manufacturer === 'object') {
      validation.availableData.manufacturer = true;
    } else {
      validation.warnings.push('Данные изготовителя отсутствуют');
    }

    // Проверяем продукцию (опционально)
    if (documentData.product && typeof documentData.product === 'object') {
      validation.availableData.product = true;
    } else {
      validation.warnings.push('Данные продукции отсутствуют');
    }

    // Проверяем лаборатории (опционально)
    if (documentData.testingLabs && Array.isArray(documentData.testingLabs) && documentData.testingLabs.length > 0) {
      validation.availableData.testingLabs = true;
    } else {
      validation.warnings.push('Данные лабораторий отсутствуют');
    }

    // Проверяем контакты (опционально)
    if (documentData.contacts && Array.isArray(documentData.contacts) && documentData.contacts.length > 0) {
      validation.availableData.contacts = true;
    } else {
      validation.warnings.push('Контактные данные отсутствуют');
    }

    // Проверяем адреса (опционально)
    if (documentData.addresses && Array.isArray(documentData.addresses) && documentData.addresses.length > 0) {
      validation.availableData.addresses = true;
    } else {
      validation.warnings.push('Адресные данные отсутствуют');
    }

    return validation;
  }

  /**
   * Отправляет данные документа в базу
   */
  async saveDocument(documentData) {
    try {
      // Валидируем данные перед отправкой
      const validation = this.validateDocumentData(documentData);
      
      if (!validation.isValid) {
        this.log(`❌ Документ невалиден: ${validation.missingFields.join(', ')}`, 'ERROR');
        return { success: false, error: `Отсутствуют обязательные поля: ${validation.missingFields.join(', ')}` };
      }

      // Логируем доступные данные
      const availableSections = Object.entries(validation.availableData)
        .filter(([key, value]) => value)
        .map(([key]) => key);
      
      this.log(`📋 Доступные данные для документа ${documentData.documents.idDeclaration}: ${availableSections.join(', ')}`, 'INFO');
      
      // Логируем предупреждения
      if (validation.warnings.length > 0) {
        this.log(`⚠️ Предупреждения для документа ${documentData.documents.idDeclaration}: ${validation.warnings.join(', ')}`, 'WARN');
      }

      this.log(`📤 Отправляем документ ${documentData.documents.idDeclaration} в базу данных...`, 'INFO');
      
      const response = await fetch(this.gateUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(documentData)
      });

      const result = await response.json();

      if (response.ok && result.success) {
        this.log(`✅ Документ ${documentData.documents.idDeclaration} успешно сохранен в базу`, 'SUCCESS');
        return { success: true, data: result.data };
      } else {
        this.log(`❌ Ошибка сохранения документа ${documentData.documents.idDeclaration}: ${result.message}`, 'ERROR');
        return { success: false, error: result.message };
      }

    } catch (error) {
      const documentId = documentData.documents?.idDeclaration || 'unknown';
      this.log(`❌ Ошибка отправки документа ${documentId}: ${error.message}`, 'ERROR');
      return { success: false, error: error.message };
    }
  }

  /**
   * Отправляет массив документов
   */
  async saveDocuments(documents) {
    const results = [];
    let successCount = 0;
    let errorCount = 0;

    for (const document of documents) {
      const result = await this.saveDocument(document);
      results.push(result);
      
      if (result.success) {
        successCount++;
      } else {
        errorCount++;
      }

      // Небольшая пауза между запросами
      await new Promise(resolve => setTimeout(resolve, 100));
    }

    this.log(`📊 Результат сохранения: ${successCount} успешно, ${errorCount} ошибок`, 'INFO');
    return {
      success: errorCount === 0,
      results: results,
      successCount: successCount,
      errorCount: errorCount
    };
  }
}
