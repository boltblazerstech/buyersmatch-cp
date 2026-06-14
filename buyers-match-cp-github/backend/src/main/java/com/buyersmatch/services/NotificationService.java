package com.buyersmatch.services;

import com.buyersmatch.entities.Assignment;
import com.buyersmatch.entities.Notification;
import com.buyersmatch.repositories.AssignmentRepository;
import com.buyersmatch.repositories.NotificationRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;

import java.time.LocalDate;
import java.time.ZoneId;
import java.time.format.DateTimeFormatter;
import java.time.format.DateTimeParseException;
import java.util.List;
import java.util.Map;
import java.util.UUID;

@Service
@Slf4j
@RequiredArgsConstructor
public class NotificationService {

    private final NotificationRepository notificationRepository;
    private final AssignmentRepository assignmentRepository;

    private static final Map<String, String> STATUS_TO_TYPE = Map.of(
            "Property Assigned", "PROPERTY_ASSIGNED",
            "Offer Submitted", "OFFER_SUBMITTED",
            "Offer Accepted", "OFFER_ACCEPTED",
            "Contract Unconditional", "CONTRACT_UNCONDITIONAL",
            "Settled", "SETTLEMENT_DONE"
    );

    private static final Map<String, String> TYPE_TO_TITLE = Map.of(
            "PROPERTY_ASSIGNED", "New Property Matched",
            "OFFER_SUBMITTED", "Offer Submitted",
            "OFFER_ACCEPTED", "Offer Accepted",
            "CONTRACT_UNCONDITIONAL", "Contract Unconditional",
            "SETTLEMENT_DONE", "Settlement Complete",
            "REVALUATION", "Property Revaluation Due"
    );

    private static final Map<String, String> TYPE_TO_MESSAGE = Map.of(
            "PROPERTY_ASSIGNED", "A new investment opportunity has been matched to your strategy. Review the property details and next steps in your portal.",
            "OFFER_SUBMITTED", "Your offer has been successfully submitted to the agent. We'll keep you updated as soon as we receive a response.",
            "OFFER_ACCEPTED", "Great news — your offer has been accepted! We're now moving ahead with contracts and due diligence.",
            "CONTRACT_UNCONDITIONAL", "Your contract is now unconditional and fully secured. We're progressing towards settlement with all checks complete.",
            "SETTLEMENT_DONE", "Congratulations — your property has officially settled! Your investment journey continues, and we're here for the next steps.",
            "REVALUATION", "It's time to review your property's current market value. Reach out to us to assess your equity position and plan your next move."
    );

    public void createNotificationFromStatus(
            String zohoAssignmentId,
            String zohoContactId,
            String zohoPropertyId,
            String zohoStatus) {

        String type = STATUS_TO_TYPE.get(zohoStatus);
        if (type == null) {
            return;
        }

        boolean exists = notificationRepository
                .findByZohoAssignmentIdAndType(zohoAssignmentId, type)
                .isPresent();
        if (exists) {
            return;
        }

        Notification notification = new Notification();
        notification.setZohoAssignmentId(zohoAssignmentId);
        notification.setZohoContactId(zohoContactId);
        notification.setZohoPropertyId(zohoPropertyId);
        notification.setType(type);
        notification.setTitle(TYPE_TO_TITLE.get(type));
        notification.setMessage(TYPE_TO_MESSAGE.get(type));

        notificationRepository.save(notification);
        log.info("Created notification: {} for {}", type, zohoContactId);
    }

    public void createRevaluationNotifications() {
        List<Assignment> assignments = assignmentRepository.findAll().stream()
                .filter(a -> a.getSettlementDate() != null && !a.getSettlementDate().isBlank())
                .toList();

        LocalDate today = LocalDate.now(ZoneId.of("Australia/Sydney"));

        for (Assignment assignment : assignments) {
            LocalDate settlementDate = parseSettlementDate(assignment.getSettlementDate());
            if (settlementDate == null) {
                continue;
            }

            if (settlementDate.plusDays(90).isAfter(today)) {
                continue;
            }

            boolean exists = notificationRepository
                    .findByZohoAssignmentIdAndType(assignment.getZohoAssignmentId(), "REVALUATION")
                    .isPresent();
            if (exists) {
                continue;
            }

            Notification notification = new Notification();
            notification.setZohoAssignmentId(assignment.getZohoAssignmentId());
            notification.setZohoContactId(assignment.getZohoContactId());
            notification.setZohoPropertyId(assignment.getZohoPropertyId());
            notification.setType("REVALUATION");
            notification.setTitle(TYPE_TO_TITLE.get("REVALUATION"));
            notification.setMessage(TYPE_TO_MESSAGE.get("REVALUATION"));

            notificationRepository.save(notification);
            log.info("Created notification: REVALUATION for {}", assignment.getZohoContactId());
        }
    }

    private LocalDate parseSettlementDate(String raw) {
        try {
            return LocalDate.parse(raw, DateTimeFormatter.ofPattern("yyyy-MM-dd"));
        } catch (DateTimeParseException e1) {
            try {
                return LocalDate.parse(raw, DateTimeFormatter.ofPattern("dd-MM-yyyy"));
            } catch (DateTimeParseException e2) {
                log.warn("Could not parse settlementDate: {}", raw);
                return null;
            }
        }
    }

    public List<Notification> getNotifications(String zohoContactId) {
        return notificationRepository.findAllByZohoContactIdOrderByCreatedAtDesc(zohoContactId);
    }

    public long getUnreadCount(String zohoContactId) {
        return notificationRepository.countByZohoContactIdAndIsReadFalse(zohoContactId);
    }

    public void markAsRead(UUID notificationId) {
        notificationRepository.findById(notificationId).ifPresent(notification -> {
            notification.setIsRead(true);
            notificationRepository.save(notification);
        });
    }

    public void markAllAsRead(String zohoContactId) {
        List<Notification> unread = notificationRepository
                .findAllByZohoContactIdAndIsReadFalse(zohoContactId);
        unread.forEach(n -> n.setIsRead(true));
        notificationRepository.saveAll(unread);
    }
}
