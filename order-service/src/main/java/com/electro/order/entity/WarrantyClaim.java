package com.electro.order.entity;

import jakarta.persistence.*;
import lombok.*;

import java.math.BigDecimal;
import java.time.LocalDateTime;

@Entity
@Table(name = "warranty_claims")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
public class WarrantyClaim {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Integer id;

    @Column(name = "claim_number", nullable = false, unique = true, length = 50)
    private String claimNumber;

    @Column(name = "user_id", nullable = false)
    private Integer userId;

    @Column(name = "order_id")
    private Integer orderId;

    @Column(name = "order_detail_id")
    private Integer orderDetailId;

    @Column(name = "product_item_id")
    private Integer productItemId;

    @Column(name = "variant_id", nullable = false)
    private Integer variantId;

    @Column(name = "product_name", nullable = false)
    private String productName;

    @Column(name = "serial_number", length = 100)
    private String serialNumber;

    @Column(name = "imei", length = 20)
    private String imei;

    @Enumerated(EnumType.STRING)
    @Column(name = "issue_type", nullable = false)
    private IssueType issueType = IssueType.OTHER;

    @Column(name = "issue_description", columnDefinition = "TEXT", nullable = false)
    private String issueDescription;

    @Enumerated(EnumType.STRING)
    @Column(name = "customer_request")
    private CustomerRequest customerRequest = CustomerRequest.REPAIR;

    @Enumerated(EnumType.STRING)
    @Column(name = "status")
    private ClaimStatus status = ClaimStatus.PENDING;

    @Enumerated(EnumType.STRING)
    @Column(name = "priority")
    private Priority priority = Priority.NORMAL;

    @Column(name = "contact_name", nullable = false)
    private String contactName;

    @Column(name = "contact_phone", nullable = false, length = 20)
    private String contactPhone;

    @Column(name = "contact_email", length = 100)
    private String contactEmail;

    @Column(name = "contact_address", columnDefinition = "TEXT")
    private String contactAddress;

    @Column(name = "contact_province", length = 100)
    private String contactProvince;

    @Column(name = "contact_district", length = 100)
    private String contactDistrict;

    @Column(name = "contact_ward", length = 100)
    private String contactWard;

    @Column(name = "pickup_to_district_id")
    private Integer pickupToDistrictId;

    @Column(name = "pickup_to_ward_code", length = 20)
    private String pickupToWardCode;

    @Column(name = "received_date")
    private LocalDateTime receivedDate;

    @Column(name = "inspection_date")
    private LocalDateTime inspectionDate;

    @Column(name = "inspection_result", columnDefinition = "TEXT")
    private String inspectionResult;

    @Column(name = "repair_cost", precision = 15, scale = 2)
    private BigDecimal repairCost = BigDecimal.ZERO;

    @Column(name = "is_under_warranty")
    private Boolean isUnderWarranty = true;

    @Column(name = "completed_date")
    private LocalDateTime completedDate;

    @Column(name = "returned_date")
    private LocalDateTime returnedDate;

    @Column(name = "staff_id")
    private Integer staffId;

    @Column(name = "staff_notes", columnDefinition = "TEXT")
    private String staffNotes;

    @Column(name = "return_carrier", length = 50)
    private String returnCarrier;

    @Column(name = "return_tracking_code", length = 100)
    private String returnTrackingCode;

    @Enumerated(EnumType.STRING)
    @Column(name = "received_box_condition", length = 20)
    private ReceivedBoxCondition receivedBoxCondition;

    @Column(name = "received_imei", length = 100)
    private String receivedImei;

    @Column(name = "warehouse_inbound_notes", columnDefinition = "TEXT")
    private String warehouseInboundNotes;

    @Column(name = "image_url_1", columnDefinition = "TEXT")
    private String imageUrl1;

    @Column(name = "image_url_2", columnDefinition = "TEXT")
    private String imageUrl2;

    @Column(name = "image_url_3", columnDefinition = "TEXT")
    private String imageUrl3;

    @Column(name = "video_url", columnDefinition = "TEXT")
    private String videoUrl;

    @Enumerated(EnumType.STRING)
    @Column(name = "final_resolution")
    private FinalResolution finalResolution;

    @Column(name = "customer_feedback", columnDefinition = "TEXT")
    private String customerFeedback;

    @Column(name = "satisfaction_rating")
    private Integer satisfactionRating;

    @Column(name = "created_at")
    private LocalDateTime createdAt;

    @Column(name = "updated_at")
    private LocalDateTime updatedAt;

    @PrePersist
    protected void onCreate() {
        createdAt = LocalDateTime.now();
        updatedAt = LocalDateTime.now();
    }

    @PreUpdate
    protected void onUpdate() {
        updatedAt = LocalDateTime.now();
    }

    public enum IssueType {
        DEFECTIVE, DAMAGED, NOT_WORKING, MISSING_PARTS, OTHER
    }

    public enum CustomerRequest {
        REPAIR, REPLACE, REFUND
    }

    public enum ClaimStatus {
        PENDING, RECEIVED, INSPECTING, APPROVED, REJECTED, REPAIRING, COMPLETED, RETURNED
    }

    public enum Priority {
        LOW, NORMAL, HIGH, URGENT
    }

    public enum FinalResolution {
        REPLACE, REPAIR_RETURN, REJECT
    }

    public enum ReceivedBoxCondition {
        INTACT, DAMAGED
    }
}
