package com.ridewave.repository;

import com.ridewave.model.Vehicle;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

@Repository
public interface VehicleRepository extends JpaRepository<Vehicle, UUID> {

    List<Vehicle> findByUser_UserId(UUID userId);

    Optional<Vehicle> findByVehicleIdAndUser_UserId(UUID vehicleId, UUID userId);

    boolean existsByPlateNumber(String plateNumber);
}