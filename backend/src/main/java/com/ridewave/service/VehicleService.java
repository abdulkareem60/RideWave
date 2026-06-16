package com.ridewave.service;

import com.ridewave.dto.request.AddVehicleRequest;
import com.ridewave.dto.response.VehicleResponse;
import com.ridewave.exception.BadRequestException;
import com.ridewave.exception.DuplicateResourceException;
import com.ridewave.exception.ResourceNotFoundException;
import com.ridewave.model.User;
import com.ridewave.model.Vehicle;
import com.ridewave.model.enums.UserRole;
import com.ridewave.repository.UserRepository;
import com.ridewave.repository.VehicleRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.UUID;

@Service
@RequiredArgsConstructor
@Slf4j
public class VehicleService {

    private final VehicleRepository vehicleRepository;
    private final UserRepository    userRepository;

    @Transactional
    public VehicleResponse addVehicle(UUID driverId, AddVehicleRequest request) {
        User driver = userRepository.findById(driverId)
                .orElseThrow(() -> new ResourceNotFoundException("Driver not found"));

        if (driver.getRole() != UserRole.DRIVER) {
            throw new BadRequestException("Only drivers can register vehicles.");
        }
        if (vehicleRepository.existsByPlateNumber(request.getPlateNumber().toUpperCase())) {
            throw new DuplicateResourceException(
                    "A vehicle with plate number " + request.getPlateNumber() + " is already registered.");
        }

        Vehicle vehicle = Vehicle.builder()
                .user(driver)
                .make(request.getMake())
                .model(request.getModel())
                .year(request.getYear())
                .plateNumber(request.getPlateNumber().toUpperCase())
                .color(request.getColor())
                .totalSeats(request.getTotalSeats())
                .imageUrl(request.getImageUrl())
                .build();

        vehicle = vehicleRepository.save(vehicle);
        log.info("Vehicle added: vehicleId={}, driverId={}, plate={}",
                vehicle.getVehicleId(), driverId, vehicle.getPlateNumber());

        return VehicleResponse.from(vehicle);
    }

    @Transactional(readOnly = true)
    public List<VehicleResponse> getMyVehicles(UUID driverId) {
        return vehicleRepository.findByUser_UserId(driverId)
                .stream()
                .map(VehicleResponse::from)
                .toList();
    }

    @Transactional
    public void deleteVehicle(UUID driverId, UUID vehicleId) {
        Vehicle vehicle = vehicleRepository
                .findByVehicleIdAndUser_UserId(vehicleId, driverId)
                .orElseThrow(() -> new ResourceNotFoundException(
                        "Vehicle not found or does not belong to you."));
        vehicleRepository.delete(vehicle);
        log.info("Vehicle deleted: vehicleId={}", vehicleId);
    }
}