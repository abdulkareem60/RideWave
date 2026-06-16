package com.ridewave.dto.response;

import com.ridewave.model.Vehicle;
import lombok.Builder;
import lombok.Getter;

import java.time.LocalDateTime;
import java.util.UUID;

@Getter
@Builder
public class VehicleResponse {

    private UUID          vehicleId;
    private String        make;
    private String        model;
    private Integer       year;
    private String        plateNumber;
    private String        color;
    private Integer       totalSeats;
    private String        imageUrl;
    private LocalDateTime createdAt;

    public static VehicleResponse from(Vehicle v) {
        return VehicleResponse.builder()
                .vehicleId(v.getVehicleId())
                .make(v.getMake())
                .model(v.getModel())
                .year(v.getYear())
                .plateNumber(v.getPlateNumber())
                .color(v.getColor())
                .totalSeats(v.getTotalSeats())
                .imageUrl(v.getImageUrl())
                .createdAt(v.getCreatedAt())
                .build();
    }
}