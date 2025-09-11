import json
import os

import pulumi
from pulumi_aws import cloudwatch, ec2, ecr, ecs, iam, lb, s3

app_name = "cpr-vibe-checker"
aws_region = os.getenv("AWS_REGION", "eu-west-1")
aws_profile = os.getenv("AWS_PROFILE", "labs")

# s3 bucket for storing the data
bucket = s3.Bucket(app_name)

# ECR repository for storing the container image, and ECS cluster for running the webapp
repository = ecr.Repository(app_name)
cluster = ecs.Cluster(app_name)

# VPC and subnets
vpc = ec2.Vpc(
    f"{app_name}-vpc",
    cidr_block="10.0.0.0/16",
    enable_dns_hostnames=True,
    enable_dns_support=True,
)

public_subnet = ec2.Subnet(
    f"{app_name}-public-subnet",
    vpc_id=vpc.id,
    cidr_block="10.0.1.0/24",
    availability_zone=f"{aws_region}a",
)

private_subnet = ec2.Subnet(
    f"{app_name}-private-subnet",
    vpc_id=vpc.id,
    cidr_block="10.0.2.0/24",
    availability_zone=f"{aws_region}a",
)

igw = ec2.InternetGateway(f"{app_name}-igw", vpc_id=vpc.id)

# Route table
public_route_table = ec2.RouteTable(
    f"{app_name}-public-rt",
    vpc_id=vpc.id,
    routes=[
        ec2.RouteTableRouteArgs(
            cidr_block="0.0.0.0/0",
            gateway_id=igw.id,
        )
    ],
)

ec2.RouteTableAssociation(
    f"{app_name}-public-rta",
    subnet_id=public_subnet.id,
    route_table_id=public_route_table.id,
)

# NAT Gateway for private subnet internet access
nat_eip = ec2.Eip(f"{app_name}-nat-eip", domain="vpc")

nat_gateway = ec2.NatGateway(
    f"{app_name}-nat-gw",
    allocation_id=nat_eip.id,
    subnet_id=public_subnet.id,
)

# Route table for private subnet
private_route_table = ec2.RouteTable(
    f"{app_name}-private-rt",
    vpc_id=vpc.id,
    routes=[
        ec2.RouteTableRouteArgs(
            cidr_block="0.0.0.0/0",
            nat_gateway_id=nat_gateway.id,
        )
    ],
)

# Associate private subnet with private route table
ec2.RouteTableAssociation(
    f"{app_name}-private-rta",
    subnet_id=private_subnet.id,
    route_table_id=private_route_table.id,
)

# Security groups
alb_security_group = ec2.SecurityGroup(
    f"{app_name}-alb-sg",
    vpc_id=vpc.id,
    description="Allow HTTP and HTTPS inbound traffic",
    ingress=[
        ec2.SecurityGroupIngressArgs(
            protocol="tcp",
            from_port=80,
            to_port=80,
            cidr_blocks=["0.0.0.0/0"],
            description="HTTP",
        ),
        ec2.SecurityGroupIngressArgs(
            protocol="tcp",
            from_port=443,
            to_port=443,
            cidr_blocks=["0.0.0.0/0"],
            description="HTTPS",
        ),
    ],
    egress=[
        ec2.SecurityGroupEgressArgs(
            protocol="-1",
            from_port=0,
            to_port=0,
            cidr_blocks=["0.0.0.0/0"],
        )
    ],
)

ecs_security_group = ec2.SecurityGroup(
    f"{app_name}-ecs-sg",
    vpc_id=vpc.id,
    description="Allow inbound traffic from ALB",
    ingress=[
        ec2.SecurityGroupIngressArgs(
            protocol="tcp",
            from_port=80,
            to_port=80,
            security_groups=[alb_security_group.id],
            description="Next.js app port",
        ),
    ],
    egress=[
        ec2.SecurityGroupEgressArgs(
            protocol="-1",
            from_port=0,
            to_port=0,
            cidr_blocks=["0.0.0.0/0"],
        )
    ],
)

# IAM roles
execution_role = iam.Role(
    f"{app_name}-execution-role",
    assume_role_policy="""{
        "Version": "2012-10-17",
        "Statement": [
            {
                "Effect": "Allow",
                "Principal": {
                    "Service": "ecs-tasks.amazonaws.com"
                },
                "Action": "sts:AssumeRole"
            }
        ]
    }""",
)

iam.RolePolicyAttachment(
    f"{app_name}-execution-role-policy",
    role=execution_role.name,
    policy_arn="arn:aws:iam::aws:policy/service-role/AmazonECSTaskExecutionRolePolicy",
)

task_role = iam.Role(
    f"{app_name}-task-role",
    assume_role_policy="""{
        "Version": "2012-10-17",
        "Statement": [
            {
                "Effect": "Allow",
                "Principal": {
                    "Service": "ecs-tasks.amazonaws.com"
                },
                "Action": "sts:AssumeRole"
            }
        ]
    }""",
)

# Create a custom iam policy that only allows access to the vibe-checker bucket
s3_read_only_policy = iam.Policy(
    f"{app_name}-s3-policy",
    policy=pulumi.Output.all(bucket.arn).apply(
        lambda args: f"""{{
            "Version": "2012-10-17",
            "Statement": [
                {{
                    "Effect": "Allow",
                    "Action": [
                        "s3:GetObject",
                        "s3:ListBucket"
                    ],
                    "Resource": [
                        "{args[0]}",
                        "{args[0]}/*"
                    ]
                }}
            ]
        }}"""
    ),
)

# Attach the custom policy to the task role
iam.RolePolicyAttachment(
    f"{app_name}-s3-read-policy",
    role=task_role.name,
    policy_arn=s3_read_only_policy.arn,
)

# Application Load Balancer
alb = lb.LoadBalancer(
    f"{app_name}-alb",
    internal=False,
    load_balancer_type="application",
    security_groups=[alb_security_group.id],
    subnets=[public_subnet.id],
)

# Target group for ECS service
target_group = lb.TargetGroup(
    f"{app_name}-tg",
    port=80,
    protocol="HTTP",
    target_type="ip",
    vpc_id=vpc.id,
    health_check=lb.TargetGroupHealthCheckArgs(
        path="/",
        protocol="HTTP",
        matcher="200",
        interval=30,
        timeout=5,
    ),
)

# ALB listener
listener = lb.Listener(
    f"{app_name}-listener",
    load_balancer_arn=alb.arn,
    port=80,
    protocol="HTTP",
    default_actions=[
        lb.ListenerDefaultActionArgs(
            type="forward",
            target_group_arn=target_group.arn,
        )
    ],
)

# CloudWatch log group
log_group = cloudwatch.LogGroup(
    f"{app_name}-log-group",
    name=f"/ecs/{app_name}",
    retention_in_days=7,
)

# ECS task definition
task_definition = ecs.TaskDefinition(
    f"{app_name}-task-def",
    family=f"{app_name}-family",
    cpu="256",
    memory="512",
    network_mode="awsvpc",
    requires_compatibilities=["FARGATE"],
    execution_role_arn=execution_role.arn,
    task_role_arn=task_role.arn,
    container_definitions=pulumi.Output.all(
        bucket.bucket, repository.repository_url
    ).apply(
        lambda args: json.dumps(
            [
                {
                    "name": app_name,
                    "image": f"{args[1]}:latest",
                    "portMappings": [
                        {"containerPort": 80, "hostPort": 80, "protocol": "tcp"}
                    ],
                    "environment": [
                        {"name": "S3_BUCKET_NAME", "value": args[0]},
                        {"name": "AWS_REGION", "value": aws_region},
                    ],
                    "logConfiguration": {
                        "logDriver": "awslogs",
                        "options": {
                            "awslogs-group": f"/ecs/{app_name}",
                            "awslogs-region": aws_region,
                            "awslogs-stream-prefix": "ecs",
                        },
                    },
                }
            ]
        )
    ),
)

# ECS service
service = ecs.Service(
    f"{app_name}-service",
    cluster=cluster.arn,
    task_definition=task_definition.arn,
    desired_count=1,
    launch_type="FARGATE",
    network_configuration=ecs.ServiceNetworkConfigurationArgs(
        subnets=[private_subnet.id],
        security_groups=[ecs_security_group.id],
        assign_public_ip=False,
    ),
    load_balancers=[
        ecs.ServiceLoadBalancerArgs(
            target_group_arn=target_group.arn,
            container_name=app_name,
            container_port=80,
        )
    ],
)

# Exports
pulumi.export("alb_dns_name", alb.dns_name)
pulumi.export("bucket_name", bucket.bucket)
pulumi.export("repository_url", repository.repository_url)
