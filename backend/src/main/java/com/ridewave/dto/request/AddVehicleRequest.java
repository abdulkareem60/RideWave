package com.ridewave.dto.request;

import jakarta.validation.constraints.*;
import lombok.Getter;
import lombok.Setter;

@Getter
@Setter
public class AddVehicleRequest {

    @NotBlank(message = "Vehicle make is required")
    @Size(max = 50)
    private String make;

    @NotBlank(message = "Vehicle model is required")
    @Size(max = 50)
    private String model;

    @NotNull(message = "Year is required")
    @Min(value = 1980, message = "Year must be 1980 or later")
    @Max(value = 2030, message = "Year cannot exceed 2030")
    private Integer year;

    @NotBlank(message = "Plate number is required")
    @Size(max = 20)
    private String plateNumber;

    @Size(max = 30)
    private String color;

    @NotNull(message = "Total seats is required")
    @Min(value = 1, message = "Vehicle must have at least 1 seat")
    @Max(value = 8, message = "Vehicle cannot have more than 8 seats")
    private Integer totalSeats;

    /** Optional — vehicle photo URL (base64 data URL or external link). */
    private String imageUrl;
}