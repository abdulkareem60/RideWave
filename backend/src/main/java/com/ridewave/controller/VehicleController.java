package com.ridewave.controller;

import com.ridewave.dto.request.AddVehicleRequest;
import com.ridewave.dto.response.ApiResponse;
import com.ridewave.dto.response.VehicleResponse;
import com.ridewave.security.UserPrincipal;
import com.ridewave.service.VehicleService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.security.SecurityRequirement;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.UUID;

@RestController
@RequestMapping("/api/v1/vehicles")
@RequiredArgsConstructor
@Tag(name = "Vehicles", description = "Driver vehicle management")
@SecurityRequirement(name = "bearerAuth")
public class VehicleController {

    private final VehicleService vehicleService;

    @PostMapping
    @PreAuthorize("hasRole('DRIVER')")
    @Operation(summary = "Register a new vehicle")
    public ResponseEntity<ApiResponse<VehicleResponse>> addVehicle(
            @Valid @RequestBody AddVehicleRequest request,
            @AuthenticationPrincipal UserPrincipal currentUser) {

        VehicleResponse vehicle = vehicleService.addVehicle(currentUser.getId(), request);
        return ResponseEntity.status(HttpStatus.CREATED)
                .body(ApiResponse.success(vehicle, "Vehicle registered successfully."));
    }

    @GetMapping
    @PreAuthorize("hasRole('DRIVER')")
    @Operation(summary = "List all vehicles belonging to the current driver")
    public ResponseEntity<ApiResponse<List<VehicleResponse>>> getMyVehicles(
            @AuthenticationPrincipal UserPrincipal currentUser) {

        List<VehicleResponse> vehicles = vehicleService.getMyVehicles(currentUser.getId());
        return ResponseEntity.ok(ApiResponse.success(vehicles));
    }

    @DeleteMapping("/{vehicleId}")
    @PreAuthorize("hasRole('DRIVER')")
    @Operation(summary = "Remove a vehicle")
    public ResponseEntity<ApiResponse<Void>> deleteVehicle(
            @PathVariable UUID vehicleId,
            @AuthenticationPrincipal UserPrincipal currentUser) {

        vehicleService.deleteVehicle(currentUser.getId(), vehicleId);
        return ResponseEntity.ok(ApiResponse.ok("Vehicle removed successfully."));
    }
}