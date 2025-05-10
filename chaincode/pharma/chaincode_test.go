package main

import (
	"encoding/json"
	"fmt"
	"testing"
	"time"

	"github.com/hyperledger/fabric-contract-api-go/contractapi"
	"github.com/hyperledger/fabric-chaincode-go/shim"
	"github.com/hyperledger/fabric-chaincode-go/shimtest"
)

type MockClientIdentity struct {
	MspID string
	ID    string
}

func (ci *MockClientIdentity) GetID() (string, error) {
	return ci.ID, nil
}

func (ci *MockClientIdentity) GetMSPID() (string, error) {
	return ci.MspID, nil
}

type MockTransactionContext struct {
	contractapi.TransactionContext
	mockStub          *shimtest.MockStub
	clientIdentity    *MockClientIdentity
}

func (ctx *MockTransactionContext) GetStub() shim.ChaincodeStubInterface {
	return ctx.mockStub
}

func (ctx *MockTransactionContext) GetClientIdentity() shim.ClientIdentity {
	return ctx.clientIdentity
}

func setupTest() (*MockTransactionContext, *SmartContract) {
	chaincode := new(SmartContract)
	stub := shimtest.NewMockStub("mockstub", nil)
	clientIdentity := &MockClientIdentity{MspID: "ManufacturerMSP", ID: "manufacturer1"}
	transactionContext := &MockTransactionContext{
		mockStub:       stub,
		clientIdentity: clientIdentity,
	}
	return transactionContext, chaincode
}

func TestCreateDrugBatch(t *testing.T) {
	ctx, chaincode := setupTest()

	// Test successful creation
	err := chaincode.CreateDrugBatch(ctx, "batch1", "Paracetamol", "B001", 
		time.Now().Format(time.RFC3339), 
		time.Now().AddDate(2, 0, 0).Format(time.RFC3339))
	
	if err != nil {
		t.Fatalf("Failed to create drug batch: %v", err)
	}

	// Test duplicate creation
	err = chaincode.CreateDrugBatch(ctx, "batch1", "Paracetamol", "B001",
		time.Now().Format(time.RFC3339),
		time.Now().AddDate(2, 0, 0).Format(time.RFC3339))
	
	if err == nil {
		t.Fatal("Expected error when creating duplicate batch")
	}

	// Test unauthorized creation
	ctx.clientIdentity.MspID = "DistributorMSP"
	err = chaincode.CreateDrugBatch(ctx, "batch2", "Aspirin", "B002",
		time.Now().Format(time.RFC3339),
		time.Now().AddDate(2, 0, 0).Format(time.RFC3339))
	
	if err == nil {
		t.Fatal("Expected error when non-manufacturer creates batch")
	}
}

func TestTransferDrugBatch(t *testing.T) {
	ctx, chaincode := setupTest()

	// Create initial batch
	manufactureDate := time.Now().Format(time.RFC3339)
	expiryDate := time.Now().AddDate(2, 0, 0).Format(time.RFC3339)
	err := chaincode.CreateDrugBatch(ctx, "batch1", "Paracetamol", "B001", 
		manufactureDate, expiryDate)
	
	if err != nil {
		t.Fatalf("Failed to create drug batch: %v", err)
	}

	// Test valid transfer from Manufacturer to Distributor
	ctx.clientIdentity.MspID = "ManufacturerMSP"
	err = chaincode.TransferDrugBatch(ctx, "batch1", "distributor1", "InTransit", 
		"Warehouse A", 20.5)
	
	if err != nil {
		t.Fatalf("Failed to transfer drug batch: %v", err)
	}

	// Test invalid transfer (wrong status transition)
	ctx.clientIdentity.MspID = "PharmacyMSP"
	err = chaincode.TransferDrugBatch(ctx, "batch1", "pharmacy1", "Sold", 
		"Pharmacy A", 21.0)
	
	if err == nil {
		t.Fatal("Expected error when pharmacy tries to sell drugs in transit")
	}
}

func TestReadDrugBatch(t *testing.T) {
	ctx, chaincode := setupTest()

	// Create batch for testing
	manufactureDate := time.Now().Format(time.RFC3339)
	expiryDate := time.Now().AddDate(2, 0, 0).Format(time.RFC3339)
	err := chaincode.CreateDrugBatch(ctx, "batch1", "Paracetamol", "B001", 
		manufactureDate, expiryDate)
	
	if err != nil {
		t.Fatalf("Failed to create drug batch: %v", err)
	}

	// Test reading existing batch
	batch, err := chaincode.ReadDrugBatch(ctx, "batch1")
	if err != nil {
		t.Fatalf("Failed to read drug batch: %v", err)
	}
	if batch.Name != "Paracetamol" {
		t.Fatalf("Retrieved incorrect drug batch data")
	}

	// Test reading non-existent batch
	_, err = chaincode.ReadDrugBatch(ctx, "nonexistent")
	if err == nil {
		t.Fatal("Expected error when reading non-existent batch")
	}
}

func TestGetAllDrugBatches(t *testing.T) {
	ctx, chaincode := setupTest()

	// Create multiple batches
	manufactureDate := time.Now().Format(time.RFC3339)
	expiryDate := time.Now().AddDate(2, 0, 0).Format(time.RFC3339)
	
	batchData := []struct {
		id    string
		name  string
		batch string
	}{
		{"batch1", "Paracetamol", "B001"},
		{"batch2", "Aspirin", "B002"},
		{"batch3", "Ibuprofen", "B003"},
	}

	for _, data := range batchData {
		err := chaincode.CreateDrugBatch(ctx, data.id, data.name, data.batch, 
			manufactureDate, expiryDate)
		if err != nil {
			t.Fatalf("Failed to create drug batch: %v", err)
		}
	}

	// Test getting all batches
	batches, err := chaincode.GetAllDrugBatches(ctx)
	if err != nil {
		t.Fatalf("Failed to get all drug batches: %v", err)
	}
	if len(batches) != len(batchData) {
		t.Fatalf("Retrieved incorrect number of batches. Expected: %d, Got: %d", 
			len(batchData), len(batches))
	}
}

func TestRegulatorFunctions(t *testing.T) {
	ctx, chaincode := setupTest()

	// Create test data
	manufactureDate := time.Now().Format(time.RFC3339)
	expiryDate := time.Now().AddDate(2, 0, 0).Format(time.RFC3339)
	
	// Set up as manufacturer first
	ctx.clientIdentity.MspID = "ManufacturerMSP"
	err := chaincode.CreateDrugBatch(ctx, "batch1", "Paracetamol", "B001", 
		manufactureDate, expiryDate)
	if err != nil {
		t.Fatalf("Failed to create drug batch: %v", err)
	}

	// Test querying drug batches
	ctx.clientIdentity.MspID = "RegulatorMSP"
	queryString := `{"selector":{"name":"Paracetamol"}}`
	batches, err := chaincode.QueryDrugBatches(ctx, queryString)
	if err != nil {
		t.Fatalf("Failed to query drug batches: %v", err)
	}
	if len(batches) != 1 {
		t.Fatalf("Expected 1 batch, got %d", len(batches))
	}

	// Test flagging a drug batch
	err = chaincode.FlagDrugBatch(ctx, "batch1", "Temperature deviation", "HIGH")
	if err != nil {
		t.Fatalf("Failed to flag drug batch: %v", err)
	}

	// Verify batch was flagged
	batch, err := chaincode.ReadDrugBatch(ctx, "batch1")
	if err != nil {
		t.Fatalf("Failed to read drug batch: %v", err)
	}
	if batch.Status != "Flagged" {
		t.Fatalf("Expected batch status to be 'Flagged', got '%s'", batch.Status)
	}

	// Test unauthorized access
	ctx.clientIdentity.MspID = "DistributorMSP"
	err = chaincode.FlagDrugBatch(ctx, "batch1", "Suspicious activity", "HIGH")
	if err == nil {
		t.Fatal("Expected error when non-regulator tries to flag batch")
	}
}

func TestComplianceReport(t *testing.T) {
	ctx, chaincode := setupTest()
	
	// Create test data
	ctx.clientIdentity.MspID = "ManufacturerMSP"
	batchData := []struct {
		id    string
		name  string
		batch string
		temp  float32
	}{
		{"batch1", "Paracetamol", "B001", 5.0},
		{"batch2", "Aspirin", "B002", 1.0}, // Temperature violation
		{"batch3", "Ibuprofen", "B003", 9.0}, // Temperature violation
	}

	manufactureDate := time.Now().Format(time.RFC3339)
	expiryDate := time.Now().AddDate(2, 0, 0).Format(time.RFC3339)

	for _, data := range batchData {
		err := chaincode.CreateDrugBatch(ctx, data.id, data.name, data.batch,
			manufactureDate, expiryDate)
		if err != nil {
			t.Fatalf("Failed to create drug batch: %v", err)
		}

		// Add temperature data
		err = chaincode.TransferDrugBatch(ctx, data.id, "distributor1", "InTransit",
			"Warehouse A", data.temp)
		if err != nil {
			t.Fatalf("Failed to transfer drug batch: %v", err)
		}
	}

	// Test compliance report generation
	ctx.clientIdentity.MspID = "RegulatorMSP"
	startDate := time.Now().AddDate(0, -1, 0).Format(time.RFC3339) // 1 month ago
	endDate := time.Now().AddDate(0, 1, 0).Format(time.RFC3339)    // 1 month from now
	
	report, err := chaincode.GenerateComplianceReport(ctx, startDate, endDate, "distributor1")
	if err != nil {
		t.Fatalf("Failed to generate compliance report: %v", err)
	}

	if report.TotalBatches != 3 {
		t.Fatalf("Expected 3 total batches, got %d", report.TotalBatches)
	}
	if report.CompliantBatches != 1 {
		t.Fatalf("Expected 1 compliant batch, got %d", report.CompliantBatches)
	}
	if report.ViolationsBatches != 2 {
		t.Fatalf("Expected 2 violation batches, got %d", report.ViolationsBatches)
	}
}

func TestTemperatureViolations(t *testing.T) {
	ctx, chaincode := setupTest()
	
	// Create test data with temperature violations
	ctx.clientIdentity.MspID = "ManufacturerMSP"
	batchData := []struct {
		id    string
		name  string
		temp  float32
	}{
		{"batch1", "Medicine A", 7.0},  // Compliant
		{"batch2", "Medicine B", 1.5},  // Violation
		{"batch3", "Medicine C", 8.5},  // Violation
		{"batch4", "Medicine D", 5.0},  // Compliant
	}

	manufactureDate := time.Now().Format(time.RFC3339)
	expiryDate := time.Now().AddDate(2, 0, 0).Format(time.RFC3339)

	for _, data := range batchData {
		err := chaincode.CreateDrugBatch(ctx, data.id, data.name, "B001",
			manufactureDate, expiryDate)
		if err != nil {
			t.Fatalf("Failed to create drug batch: %v", err)
		}

		err = chaincode.TransferDrugBatch(ctx, data.id, "distributor1", "InTransit",
			"Warehouse A", data.temp)
		if err != nil {
			t.Fatalf("Failed to transfer drug batch: %v", err)
		}
	}

	// Test temperature violations query
	ctx.clientIdentity.MspID = "RegulatorMSP"
	startDate := time.Now().AddDate(0, -1, 0).Format(time.RFC3339)
	endDate := time.Now().AddDate(0, 1, 0).Format(time.RFC3339)

	violations, err := chaincode.GetTemperatureViolations(ctx, startDate, endDate)
	if err != nil {
		t.Fatalf("Failed to get temperature violations: %v", err)
	}

	if len(violations) != 2 {
		t.Fatalf("Expected 2 temperature violations, got %d", len(violations))
	}
}