package main

import (
	"encoding/json"
	"fmt"
	"time"

	"github.com/hyperledger/fabric-contract-api-go/contractapi"
)

// SmartContract provides functions for managing drug supply chain
type SmartContract struct {
	contractapi.Contract
}

// DrugBatch represents a batch of drugs in the supply chain
type DrugBatch struct {
	ID            string    `json:"id"`
	Name          string    `json:"name"`
	Manufacturer  string    `json:"manufacturer"`
	BatchNumber   string    `json:"batchNumber"`
	ManufactureDate time.Time `json:"manufactureDate"`
	ExpiryDate   time.Time `json:"expiryDate"`
	CurrentOwner  string    `json:"currentOwner"`
	Status       string    `json:"status"` // Manufactured, InTransit, Delivered, Expired
	Temperature  []float32 `json:"temperature"` // Temperature history
	Location     string    `json:"location"`
	History      []OwnershipRecord `json:"history"`
}

// OwnershipRecord represents a transfer in the chain of custody
type OwnershipRecord struct {
	Owner     string    `json:"owner"`
	Timestamp time.Time `json:"timestamp"`
	Status    string    `json:"status"`
	Location  string    `json:"location"`
}

// Flag status for suspicious batches
type FlagStatus struct {
	ID        string    `json:"id"`
	BatchID   string    `json:"batchId"`
	Reason    string    `json:"reason"`
	Severity  string    `json:"severity"`
	FlaggedBy string    `json:"flaggedBy"`
	FlaggedAt time.Time `json:"flaggedAt"`
}

// ComplianceReport structure for organization compliance
type ComplianceReport struct {
	OrganizationID     string `json:"organizationId"`
	TotalBatches      int    `json:"totalBatches"`
	CompliantBatches  int    `json:"compliantBatches"`
	ViolationsBatches int    `json:"violationsBatches"`
	ReportPeriod struct {
		Start time.Time `json:"start"`
		End   time.Time `json:"end"`
	} `json:"reportPeriod"`
	Violations []struct {
		Type        string `json:"type"`
		Count       int    `json:"count"`
		Description string `json:"description"`
	} `json:"violations"`
}

// InitLedger adds a base set of cars to the ledger
func (s *SmartContract) InitLedger(ctx contractapi.TransactionContextInterface) error {
	return nil
}

// CreateDrugBatch issues a new drug batch to the world state with given details
func (s *SmartContract) CreateDrugBatch(ctx contractapi.TransactionContextInterface, id string, name string, batchNumber string, 
	manufactureDate string, expiryDate string) error {
	
	// Check if creator is from ManufacturerOrg
	clientOrgID, err := ctx.GetClientIdentity().GetMSPID()
	if err != nil {
		return fmt.Errorf("failed to get client identity: %v", err)
	}
	
	if clientOrgID != "ManufacturerMSP" {
		return fmt.Errorf("client not authorized to create drug batches. Must be from ManufacturerOrg")
	}

	exists, err := s.DrugBatchExists(ctx, id)
	if err != nil {
		return err
	}
	if exists {
		return fmt.Errorf("the drug batch %s already exists", id)
	}

	mDate, err := time.Parse(time.RFC3339, manufactureDate)
	if err != nil {
		return err
	}

	eDate, err := time.Parse(time.RFC3339, expiryDate)
	if err != nil {
		return err
	}

	creator, err := ctx.GetClientIdentity().GetID()
	if err != nil {
		return err
	}

	batch := DrugBatch{
		ID:             id,
		Name:           name,
		Manufacturer:   creator,
		BatchNumber:    batchNumber,
		ManufactureDate: mDate,
		ExpiryDate:     eDate,
		CurrentOwner:   creator,
		Status:         "Manufactured",
		Temperature:    []float32{},
		Location:       "",
		History: []OwnershipRecord{
			{
				Owner:     creator,
				Timestamp: time.Now(),
				Status:    "Manufactured",
				Location:  "",
			},
		},
	}

	batchJSON, err := json.Marshal(batch)
	if err != nil {
		return err
	}

	return ctx.GetStub().PutState(id, batchJSON)
}

// TransferDrugBatch updates the owner field of drug batch with given id in world state
func (s *SmartContract) TransferDrugBatch(ctx contractapi.TransactionContextInterface, id string, newOwner string, 
	newStatus string, location string, temperature float32) error {
	
	batch, err := s.ReadDrugBatch(ctx, id)
	if err != nil {
		return err
	}

	// Validate transfer based on organization roles
	clientOrgID, err := ctx.GetClientIdentity().GetMSPID()
	if err != nil {
		return fmt.Errorf("failed to get client identity: %v", err)
	}

	// Validate transfer logic based on organization roles
	if err := s.validateTransfer(clientOrgID, batch.Status, newStatus); err != nil {
		return err
	}

	batch.CurrentOwner = newOwner
	batch.Status = newStatus
	batch.Location = location
	batch.Temperature = append(batch.Temperature, temperature)
	
	record := OwnershipRecord{
		Owner:     newOwner,
		Timestamp: time.Now(),
		Status:    newStatus,
		Location:  location,
	}
	batch.History = append(batch.History, record)

	batchJSON, err := json.Marshal(batch)
	if err != nil {
		return err
	}

	return ctx.GetStub().PutState(id, batchJSON)
}

// ReadDrugBatch returns the drug batch stored in the world state with given id
func (s *SmartContract) ReadDrugBatch(ctx contractapi.TransactionContextInterface, id string) (*DrugBatch, error) {
	batchJSON, err := ctx.GetStub().GetState(id)
	if err != nil {
		return nil, fmt.Errorf("failed to read from world state: %v", err)
	}
	if batchJSON == nil {
		return nil, fmt.Errorf("the drug batch %s does not exist", id)
	}

	var batch DrugBatch
	err = json.Unmarshal(batchJSON, &batch)
	if err != nil {
		return nil, err
	}

	return &batch, nil
}

// GetAllDrugBatches returns all drug batches found in world state
func (s *SmartContract) GetAllDrugBatches(ctx contractapi.TransactionContextInterface) ([]*DrugBatch, error) {
	resultsIterator, err := ctx.GetStub().GetStateByRange("", "")
	if err != nil {
		return nil, err
	}
	defer resultsIterator.Close()

	var batches []*DrugBatch
	for resultsIterator.HasNext() {
		queryResponse, err := resultsIterator.Next()
		if err != nil {
			return nil, err
		}

		var batch DrugBatch
		err = json.Unmarshal(queryResponse.Value, &batch)
		if err != nil {
			return nil, err
		}
		batches = append(batches, &batch)
	}

	return batches, nil
}

// DrugBatchExists returns true when drug batch with given ID exists in world state
func (s *SmartContract) DrugBatchExists(ctx contractapi.TransactionContextInterface, id string) (bool, error) {
	batchJSON, err := ctx.GetStub().GetState(id)
	if err != nil {
		return false, fmt.Errorf("failed to read from world state: %v", err)
	}

	return batchJSON != nil, nil
}

// validateTransfer validates if the transfer is allowed based on organization roles
func (s *SmartContract) validateTransfer(orgID string, currentStatus string, newStatus string) error {
	switch orgID {
	case "ManufacturerMSP":
		if currentStatus != "Manufactured" || newStatus != "InTransit" {
			return fmt.Errorf("manufacturer can only transfer manufactured drugs to transit")
		}
	case "DistributorMSP":
		if (currentStatus != "InTransit" && currentStatus != "Delivered") || 
			(newStatus != "InTransit" && newStatus != "Delivered") {
			return fmt.Errorf("distributor can only handle drugs in transit or delivery")
		}
	case "PharmacyMSP":
		if currentStatus != "Delivered" || newStatus != "Sold" {
			return fmt.Errorf("pharmacy can only sell delivered drugs")
		}
	default:
		return fmt.Errorf("unauthorized organization")
	}
	return nil
}

// QueryDrugBatches performs a rich query on the world state
func (s *SmartContract) QueryDrugBatches(ctx contractapi.TransactionContextInterface, queryString string) ([]*DrugBatch, error) {
	resultsIterator, err := ctx.GetStub().GetQueryResult(queryString)
	if err != nil {
		return nil, err
	}
	defer resultsIterator.Close()

	var batches []*DrugBatch
	for resultsIterator.HasNext() {
		queryResult, err := resultsIterator.Next()
		if err != nil {
			return nil, err
		}

		var batch DrugBatch
		err = json.Unmarshal(queryResult.Value, &batch)
		if err != nil {
			return nil, err
		}
		batches = append(batches, &batch)
	}

	return batches, nil
}

// GetDrugBatchHistory gets the history for a specific drug batch
func (s *SmartContract) GetDrugBatchHistory(ctx contractapi.TransactionContextInterface, batchID string) ([]OwnershipRecord, error) {
	resultsIterator, err := ctx.GetStub().GetHistoryForKey(batchID)
	if err != nil {
		return nil, err
	}
	defer resultsIterator.Close()

	var records []OwnershipRecord
	for resultsIterator.HasNext() {
		response, err := resultsIterator.Next()
		if err != nil {
			return nil, err
		}

		var batch DrugBatch
		err = json.Unmarshal(response.Value, &batch)
		if err != nil {
			return nil, err
		}

		// Get the last record from the history
		if len(batch.History) > 0 {
			records = append(records, batch.History[len(batch.History)-1])
		}
	}

	return records, nil
}

// FlagDrugBatch marks a drug batch as suspicious
func (s *SmartContract) FlagDrugBatch(ctx contractapi.TransactionContextInterface, batchID string, reason string, severity string) error {
	// Verify caller is from RegulatorOrg
	clientOrgID, err := ctx.GetClientIdentity().GetMSPID()
	if err != nil {
		return fmt.Errorf("failed to get client identity: %v", err)
	}
	if clientOrgID != "RegulatorMSP" {
		return fmt.Errorf("only regulators can flag drug batches")
	}

	batch, err := s.ReadDrugBatch(ctx, batchID)
	if err != nil {
		return err
	}

	flagStatus := FlagStatus{
		ID:        fmt.Sprintf("FLAG_%s_%s", batchID, time.Now().Format(time.RFC3339)),
		BatchID:   batchID,
		Reason:    reason,
		Severity:  severity,
		FlaggedBy: clientOrgID,
		FlaggedAt: time.Now(),
	}

	flagJSON, err := json.Marshal(flagStatus)
	if err != nil {
		return err
	}

	// Store flag status
	err = ctx.GetStub().PutState(flagStatus.ID, flagJSON)
	if err != nil {
		return err
	}

	// Update batch status if severity is high
	if severity == "HIGH" {
		batch.Status = "Flagged"
		batchJSON, err := json.Marshal(batch)
		if err != nil {
			return err
		}
		return ctx.GetStub().PutState(batchID, batchJSON)
	}

	return nil
}

// GenerateComplianceReport creates a compliance report for an organization
func (s *SmartContract) GenerateComplianceReport(ctx contractapi.TransactionContextInterface, startDate string, endDate string, organizationID string) (*ComplianceReport, error) {
	// Verify caller is from RegulatorOrg
	clientOrgID, err := ctx.GetClientIdentity().GetMSPID()
	if err != nil {
		return nil, fmt.Errorf("failed to get client identity: %v", err)
	}
	if clientOrgID != "RegulatorMSP" {
		return nil, fmt.Errorf("only regulators can generate compliance reports")
	}

	start, err := time.Parse(time.RFC3339, startDate)
	if err != nil {
		return nil, err
	}

	end, err := time.Parse(time.RFC3339, endDate)
	if err != nil {
		return nil, err
	}

	// Query all batches for the organization
	queryString := fmt.Sprintf(`{"selector":{"currentOwner":"%s"}}`, organizationID)
	batches, err := s.QueryDrugBatches(ctx, queryString)
	if err != nil {
		return nil, err
	}

	report := &ComplianceReport{
		OrganizationID: organizationID,
		TotalBatches:   len(batches),
	}
	report.ReportPeriod.Start = start
	report.ReportPeriod.End = end

	// Analyze batches for compliance
	for _, batch := range batches {
		isCompliant := true
		for _, temp := range batch.Temperature {
			if temp < 2.0 || temp > 8.0 { // Standard cold chain requirements
				isCompliant = false
				break
			}
		}
		if isCompliant {
			report.CompliantBatches++
		} else {
			report.ViolationsBatches++
		}
	}

	return report, nil
}

// GetTemperatureViolations retrieves all temperature violations within a date range
func (s *SmartContract) GetTemperatureViolations(ctx contractapi.TransactionContextInterface, startDate string, endDate string) ([]*DrugBatch, error) {
	// Verify caller is from RegulatorOrg
	clientOrgID, err := ctx.GetClientIdentity().GetMSPID()
	if err != nil {
		return nil, fmt.Errorf("failed to get client identity: %v", err)
	}
	if clientOrgID != "RegulatorMSP" {
		return nil, fmt.Errorf("only regulators can access temperature violations")
	}

	start, err := time.Parse(time.RFC3339, startDate)
	if err != nil {
		return nil, err
	}

	end, err := time.Parse(time.RFC3339, endDate)
	if err != nil {
		return nil, err
	}

	// Get all batches
	batches, err := s.GetAllDrugBatches(ctx)
	if err != nil {
		return nil, err
	}

	var violatingBatches []*DrugBatch
	for _, batch := range batches {
		if batch.ManufactureDate.After(start) && batch.ManufactureDate.Before(end) {
			for _, temp := range batch.Temperature {
				if temp < 2.0 || temp > 8.0 { // Standard cold chain requirements
					violatingBatches = append(violatingBatches, batch)
					break
				}
			}
		}
	}

	return violatingBatches, nil
}

func main() {
	chaincode, err := contractapi.NewChaincode(&SmartContract{})
	if err != nil {
		fmt.Printf("Error creating pharma chaincode: %s", err.Error())
		return
	}

	if err := chaincode.Start(); err != nil {
		fmt.Printf("Error starting pharma chaincode: %s", err.Error())
	}
}