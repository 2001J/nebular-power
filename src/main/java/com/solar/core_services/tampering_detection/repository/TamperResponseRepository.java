package com.solar.core_services.tampering_detection.repository;

import com.solar.core_services.tampering_detection.model.TamperEvent;
import com.solar.core_services.tampering_detection.model.TamperResponse;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.stereotype.Repository;

import java.time.LocalDateTime;
import java.util.List;

@Repository
public interface TamperResponseRepository extends JpaRepository<TamperResponse, Long> {
    
    List<TamperResponse> findByTamperEventOrderByExecutedAtDesc(TamperEvent tamperEvent);
    
    @Query("SELECT r FROM TamperResponse r WHERE r.tamperEvent.installation.id = ?1 ORDER BY r.executedAt DESC")
    Page<TamperResponse> findByInstallationId(Long installationId, Pageable pageable);
    
    @Query("SELECT r FROM TamperResponse r WHERE r.tamperEvent.id = ?1 AND r.responseType = ?2 ORDER BY r.executedAt DESC")
    List<TamperResponse> findByTamperEventIdAndResponseType(Long tamperEventId, TamperResponse.ResponseType responseType);
    
    @Query("SELECT r FROM TamperResponse r WHERE r.executedAt BETWEEN ?1 AND ?2 ORDER BY r.executedAt DESC")
    List<TamperResponse> findByTimeRange(LocalDateTime start, LocalDateTime end);
    
    @Query("SELECT COUNT(r) FROM TamperResponse r WHERE r.tamperEvent.id = ?1 AND r.success = true")
    long countSuccessfulResponsesByTamperEventId(Long tamperEventId);
} 